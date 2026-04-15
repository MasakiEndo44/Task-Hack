import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Zone } from '@renderer/components/Zone/Zone'
import type { Task } from '@renderer/types/task'

const mockTasks: Task[] = [
  {
    id: 'FS0001',
    title: 'Task 1',
    zone: 'NEXT_ACTION',
    priority: 'NRM',
    createdAt: '2026-04-16T08:00:00',
    order: 0
  },
  {
    id: 'FS0002',
    title: 'Task 2',
    zone: 'NEXT_ACTION',
    priority: 'URG',
    createdAt: '2026-04-16T08:01:00',
    order: 1
  }
]

describe('Zone', () => {
  it('should display zone title', () => {
    render(
      <Zone zone="NEXT_ACTION" title="NEXT ACTION" tasks={mockTasks} maxTasks={5} onComplete={vi.fn()} />
    )
    expect(screen.getByText('NEXT ACTION')).toBeInTheDocument()
  })

  it('should display task count with limit', () => {
    render(
      <Zone zone="NEXT_ACTION" title="NEXT ACTION" tasks={mockTasks} maxTasks={5} onComplete={vi.fn()} />
    )
    expect(screen.getByText('2 / 5')).toBeInTheDocument()
  })

  it('should display task count without limit when Infinity', () => {
    render(
      <Zone zone="HOLDING" title="HOLDING" tasks={mockTasks} maxTasks={Infinity} onComplete={vi.fn()} />
    )
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('should render flight strips for each task', () => {
    render(
      <Zone zone="NEXT_ACTION" title="NEXT ACTION" tasks={mockTasks} maxTasks={5} onComplete={vi.fn()} />
    )
    expect(screen.getByTestId('flight-strip-FS0001')).toBeInTheDocument()
    expect(screen.getByTestId('flight-strip-FS0002')).toBeInTheDocument()
  })

  it('should show empty state when no tasks', () => {
    render(
      <Zone zone="ACTIVE" title="ACTIVE" tasks={[]} maxTasks={1} onComplete={vi.fn()} />
    )
    expect(screen.getByText(/ドラッグ/)).toBeInTheDocument()
  })

  it('should have correct data-testid', () => {
    render(
      <Zone zone="HOLDING" title="HOLDING" tasks={[]} maxTasks={Infinity} onComplete={vi.fn()} />
    )
    expect(screen.getByTestId('zone-HOLDING')).toBeInTheDocument()
  })
})
