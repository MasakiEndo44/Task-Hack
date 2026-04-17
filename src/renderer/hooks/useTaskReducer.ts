import { useReducer, useCallback, useEffect, useState } from 'react'
import type { Task, ZoneType, TaskInput } from '../types/task'
import { isZoneFull } from '../types/task'
import { generateFlightId } from '../utils/flightId'

// --- Action Types ---

type TaskAction =
  | { type: 'ADD_TASK'; payload: TaskInput }
  | { type: 'MOVE_TASK'; payload: { taskId: string; toZone: ZoneType; toIndex: number } }
  | { type: 'COMPLETE_TASK'; payload: { taskId: string } }
  | { type: 'UNDO_COMPLETE'; payload: { taskId: string } }
  | { type: 'UPDATE_TASK'; payload: { taskId: string; updates: Partial<Task> } }
  | { type: 'DELETE_TASK'; payload: { taskId: string } }
  | { type: 'INIT_TASKS'; payload: { tasks: Task[] } }

// --- Reducer ---

function taskReducer(state: Task[], action: TaskAction): Task[] {
  switch (action.type) {
    case 'ADD_TASK': {
      const existingIds = state.map(t => t.id)
      const newTask: Task = {
        ...action.payload,
        id: generateFlightId(existingIds),
        createdAt: new Date().toISOString(),
        order: state.filter(t => t.zone === action.payload.zone).length
      }
      return [...state, newTask]
    }

    case 'MOVE_TASK': {
      const { taskId, toZone, toIndex } = action.payload
      const task = state.find(t => t.id === taskId)
      if (!task) return state

      // 同じゾーンへの移動は順序の変更のみ
      if (task.zone === toZone) {
        const zoneTasks = state
          .filter(t => t.zone === toZone && t.id !== taskId)
          .sort((a, b) => a.order - b.order)
        zoneTasks.splice(toIndex, 0, task)
        const reordered = zoneTasks.map((t, i) => ({ ...t, order: i }))
        return state.map(t => {
          const updated = reordered.find(r => r.id === t.id)
          return updated || t
        })
      }

      // 上限チェック
      const targetCount = state.filter(t => t.zone === toZone).length
      if (isZoneFull(toZone, targetCount)) {
        return state // 移動を拒否
      }

      // 依存関係チェック: ACTIVE移動時、前提タスクが未完了なら拒否
      if (toZone === 'ACTIVE' && task.dependsOn) {
        const dep = state.find(t => t.id === task.dependsOn)
        if (dep && dep.zone !== 'CLEARED') {
          return state
        }
      }

      return state.map(t =>
        t.id === taskId
          ? { ...t, zone: toZone, order: toIndex }
          : t
      )
    }

    case 'COMPLETE_TASK': {
      const { taskId } = action.payload
      return state.map(t =>
        t.id === taskId
          ? {
              ...t,
              zone: 'CLEARED' as ZoneType,
              completedAt: new Date().toISOString(),
              order: state.filter(tk => tk.zone === 'CLEARED').length
            }
          : t
      )
    }

    case 'UPDATE_TASK': {
      const { taskId, updates } = action.payload
      return state.map(t =>
        t.id === taskId ? { ...t, ...updates } : t
      )
    }

    case 'UNDO_COMPLETE': {
      const { taskId } = action.payload
      return state.map(t =>
        t.id === taskId
          ? {
              ...t,
              zone: 'HOLDING' as ZoneType,
              completedAt: undefined,
              order: state.filter(tk => tk.zone === 'HOLDING').length
            }
          : t
      )
    }

    case 'DELETE_TASK': {
      return state.filter(t => t.id !== action.payload.taskId)
    }

    case 'INIT_TASKS': {
      return action.payload.tasks
    }

    default:
      return state
  }
}

// --- Hook ---

export function useTaskReducer(initialTasks: Task[] = []) {
  const [tasks, dispatch] = useReducer(taskReducer, initialTasks)
  const [isLoaded, setIsLoaded] = useState(false)

  // 起動時の初期ロード
  useEffect(() => {
    if (window.api && window.api.loadTasks) {
      window.api.loadTasks().then((loadedTasks) => {
        if (loadedTasks) {
          dispatch({ type: 'INIT_TASKS', payload: { tasks: loadedTasks } })
        }
        setIsLoaded(true)
      }).catch(err => {
        console.error('Failed to load tasks', err)
        setIsLoaded(true)
      })
    } else {
      // For web non-electron environment: fallback to localStorage
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
        setIsLoaded(true)
        return
      }

      try {
        const localData = localStorage.getItem('task-hack-tasks')
        if (localData) {
          const parsedData = JSON.parse(localData)
          if (Array.isArray(parsedData) && parsedData.length > 0) {
            dispatch({ type: 'INIT_TASKS', payload: { tasks: parsedData } })
          }
        }
      } catch (e) {
        console.error('Failed to parse localStorage tasks', e)
      }
      setIsLoaded(true)
    }
  }, [])

  // 状態変更時のオートセーブ
  useEffect(() => {
    if (isLoaded) {
      if (window.api && window.api.saveTasks) {
        window.api.saveTasks(tasks).catch(err => console.error('Failed to save tasks', err))
      } else {
        if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') return;
        
        // Fallback to localStorage in web browsers
        try {
          localStorage.setItem('task-hack-tasks', JSON.stringify(tasks))
        } catch (e) {
          console.error('Failed to save tasks to localStorage', e)
        }
      }
    }
  }, [tasks, isLoaded])

  const getTasksByZone = useCallback(() => {
    const grouped: Record<ZoneType, Task[]> = {
      ACTIVE: [],
      NEXT_ACTION: [],
      HOLDING: [],
      CLEARED: []
    }
    for (const task of tasks) {
      grouped[task.zone].push(task)
    }
    // 各ゾーン内でorderでソート
    for (const zone of Object.keys(grouped) as ZoneType[]) {
      grouped[zone].sort((a, b) => a.order - b.order)
    }
    return grouped
  }, [tasks])

  const getZoneCounts = useCallback(() => {
    const counts: Record<ZoneType, { total: number; urgent: number }> = {
      ACTIVE: { total: 0, urgent: 0 },
      NEXT_ACTION: { total: 0, urgent: 0 },
      HOLDING: { total: 0, urgent: 0 },
      CLEARED: { total: 0, urgent: 0 }
    }
    for (const task of tasks) {
      counts[task.zone].total++
      if (task.priority === 'URG') {
        counts[task.zone].urgent++
      }
    }
    return counts
  }, [tasks])

  const getBlockingDependency = useCallback((taskId: string): Task | null => {
    const task = tasks.find(t => t.id === taskId)
    if (!task?.dependsOn) return null
    const dep = tasks.find(t => t.id === task.dependsOn)
    if (!dep || dep.zone === 'CLEARED') return null
    return dep
  }, [tasks])

  return { tasks, dispatch, getTasksByZone, getZoneCounts, getBlockingDependency }
}
