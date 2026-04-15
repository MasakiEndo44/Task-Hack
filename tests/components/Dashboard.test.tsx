import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Dashboard } from '@renderer/components/Dashboard/Dashboard'
import type { Task, ZoneType } from '@renderer/types/task'

const mockTasks: Task[] = [
  {
    id: 'FS0001',
    title: 'Active Task',
    zone: 'ACTIVE',
    priority: 'URG',
    createdAt: '2026-04-16T08:00:00',
    order: 0
  },
  {
    id: 'FS0002',
    title: 'Next Task 1',
    zone: 'NEXT_ACTION',
    priority: 'NRM',
    createdAt: '2026-04-16T08:01:00',
    order: 0
  },
  {
    id: 'FS0003',
    title: 'Holding Task',
    zone: 'HOLDING',
    priority: 'NRM',
    createdAt: '2026-04-16T08:02:00',
    order: 0
  }
]

const mockTasksByZone: Record<ZoneType, Task[]> = {
  ACTIVE: mockTasks.filter(t => t.zone === 'ACTIVE'),
  NEXT_ACTION: mockTasks.filter(t => t.zone === 'NEXT_ACTION'),
  HOLDING: mockTasks.filter(t => t.zone === 'HOLDING'),
  CLEARED: []
}

describe('Dashboard', () => {
  it('should render all four zones', () => {
    render(
      <Dashboard tasksByZone={mockTasksByZone} onComplete={vi.fn()} onUndoComplete={vi.fn()} onMoveTask={vi.fn()} />
    )
    expect(screen.getByTestId('zone-ACTIVE')).toBeInTheDocument()
    expect(screen.getByTestId('zone-NEXT_ACTION')).toBeInTheDocument()
    expect(screen.getByTestId('zone-HOLDING')).toBeInTheDocument()
    expect(screen.getByTestId('zone-CLEARED')).toBeInTheDocument()
  })

  it('should display zone titles', () => {
    render(
      <Dashboard tasksByZone={mockTasksByZone} onComplete={vi.fn()} onUndoComplete={vi.fn()} onMoveTask={vi.fn()} />
    )
    expect(screen.getByText('ACTIVE')).toBeInTheDocument()
    expect(screen.getByText('NEXT ACTION')).toBeInTheDocument()
    expect(screen.getByText('HOLDING')).toBeInTheDocument()
    expect(screen.getByText('CLEARED')).toBeInTheDocument()
  })

  it('should render flight strips in correct zones', () => {
    render(
      <Dashboard tasksByZone={mockTasksByZone} onComplete={vi.fn()} onUndoComplete={vi.fn()} onMoveTask={vi.fn()} />
    )
    expect(screen.getByTestId('flight-strip-FS0001')).toBeInTheDocument()
    expect(screen.getByTestId('flight-strip-FS0002')).toBeInTheDocument()
    expect(screen.getByTestId('flight-strip-FS0003')).toBeInTheDocument()
  })
})
