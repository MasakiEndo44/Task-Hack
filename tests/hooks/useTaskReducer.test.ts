import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTaskReducer } from '@renderer/hooks/useTaskReducer'
import type { Task, ZoneType } from '@renderer/types/task'

function createMockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'FS0001',
    title: 'Test Task',
    zone: 'HOLDING' as ZoneType,
    priority: 'NRM',
    createdAt: new Date().toISOString(),
    order: 0,
    ...overrides
  }
}

describe('useTaskReducer', () => {
  it('should initialize with empty tasks', () => {
    const { result } = renderHook(() => useTaskReducer())
    expect(result.current.tasks).toEqual([])
  })

  it('should initialize with provided tasks', () => {
    const initial = [createMockTask()]
    const { result } = renderHook(() => useTaskReducer(initial))
    expect(result.current.tasks).toHaveLength(1)
  })

  it('should add a task', () => {
    const { result } = renderHook(() => useTaskReducer())
    act(() => {
      result.current.dispatch({
        type: 'ADD_TASK',
        payload: {
          title: 'New Task',
          zone: 'HOLDING',
          priority: 'NRM'
        }
      })
    })
    expect(result.current.tasks).toHaveLength(1)
    expect(result.current.tasks[0].title).toBe('New Task')
    expect(result.current.tasks[0].id).toMatch(/^FS\d{4}$/)
    expect(result.current.tasks[0].createdAt).toBeDefined()
  })

  it('should move a task between zones', () => {
    const task = createMockTask({ zone: 'HOLDING' })
    const { result } = renderHook(() => useTaskReducer([task]))
    act(() => {
      result.current.dispatch({
        type: 'MOVE_TASK',
        payload: { taskId: 'FS0001', toZone: 'NEXT_ACTION', toIndex: 0 }
      })
    })
    expect(result.current.tasks[0].zone).toBe('NEXT_ACTION')
  })

  it('should NOT move task to ACTIVE if zone is full', () => {
    const activeTask = createMockTask({ id: 'FS0001', zone: 'ACTIVE' })
    const holdingTask = createMockTask({ id: 'FS0002', zone: 'HOLDING' })
    const { result } = renderHook(() => useTaskReducer([activeTask, holdingTask]))
    act(() => {
      result.current.dispatch({
        type: 'MOVE_TASK',
        payload: { taskId: 'FS0002', toZone: 'ACTIVE', toIndex: 0 }
      })
    })
    const movedTask = result.current.tasks.find(t => t.id === 'FS0002')
    expect(movedTask?.zone).toBe('HOLDING')
  })

  it('should NOT move task to NEXT_ACTION if zone is full (5 tasks)', () => {
    const nextTasks = Array.from({ length: 5 }, (_, i) =>
      createMockTask({ id: `FS000${i}`, zone: 'NEXT_ACTION', order: i })
    )
    const holdingTask = createMockTask({ id: 'FS0099', zone: 'HOLDING' })
    const { result } = renderHook(() => useTaskReducer([...nextTasks, holdingTask]))
    act(() => {
      result.current.dispatch({
        type: 'MOVE_TASK',
        payload: { taskId: 'FS0099', toZone: 'NEXT_ACTION', toIndex: 0 }
      })
    })
    const movedTask = result.current.tasks.find(t => t.id === 'FS0099')
    expect(movedTask?.zone).toBe('HOLDING')
  })

  it('should complete a task (move to CLEARED)', () => {
    const task = createMockTask({ zone: 'ACTIVE' })
    const { result } = renderHook(() => useTaskReducer([task]))
    act(() => {
      result.current.dispatch({
        type: 'COMPLETE_TASK',
        payload: { taskId: 'FS0001' }
      })
    })
    expect(result.current.tasks[0].zone).toBe('CLEARED')
    expect(result.current.tasks[0].completedAt).toBeDefined()
  })

  it('should return tasks grouped by zone via getTasksByZone', () => {
    const tasks = [
      createMockTask({ id: 'FS0001', zone: 'ACTIVE' }),
      createMockTask({ id: 'FS0002', zone: 'NEXT_ACTION' }),
      createMockTask({ id: 'FS0003', zone: 'NEXT_ACTION' }),
      createMockTask({ id: 'FS0004', zone: 'HOLDING' }),
      createMockTask({ id: 'FS0005', zone: 'CLEARED' })
    ]
    const { result } = renderHook(() => useTaskReducer(tasks))
    const grouped = result.current.getTasksByZone()
    expect(grouped.ACTIVE).toHaveLength(1)
    expect(grouped.NEXT_ACTION).toHaveLength(2)
    expect(grouped.HOLDING).toHaveLength(1)
    expect(grouped.CLEARED).toHaveLength(1)
  })

  it('should return zone counts via getZoneCounts', () => {
    const tasks = [
      createMockTask({ id: 'FS0001', zone: 'ACTIVE', priority: 'URG' }),
      createMockTask({ id: 'FS0002', zone: 'NEXT_ACTION', priority: 'NRM' }),
      createMockTask({ id: 'FS0003', zone: 'NEXT_ACTION', priority: 'URG' }),
      createMockTask({ id: 'FS0004', zone: 'HOLDING', priority: 'NRM' })
    ]
    const { result } = renderHook(() => useTaskReducer(tasks))
    const counts = result.current.getZoneCounts()
    expect(counts.ACTIVE).toEqual({ total: 1, urgent: 1 })
    expect(counts.NEXT_ACTION).toEqual({ total: 2, urgent: 1 })
    expect(counts.HOLDING).toEqual({ total: 1, urgent: 0 })
    expect(counts.CLEARED).toEqual({ total: 0, urgent: 0 })
  })
})
