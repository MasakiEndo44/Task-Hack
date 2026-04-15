import { useReducer, useCallback } from 'react'
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

    default:
      return state
  }
}

// --- Hook ---

export function useTaskReducer(initialTasks: Task[] = []) {
  const [tasks, dispatch] = useReducer(taskReducer, initialTasks)

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

  return { tasks, dispatch, getTasksByZone, getZoneCounts }
}
