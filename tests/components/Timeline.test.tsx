import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Timeline } from '@renderer/components/Timeline/Timeline'
import type { Task } from '@renderer/types/task'

const mockTasks: Task[] = [
  {
    id: 'FS0001',
    title: 'Morning Meeting',
    zone: 'ACTIVE',
    priority: 'NRM',
    scheduledStart: '2026-04-16T09:00:00',
    scheduledEnd: '2026-04-16T10:00:00',
    createdAt: '2026-04-16T08:00:00',
    order: 0
  },
  {
    id: 'FS0002',
    title: 'Development',
    zone: 'NEXT_ACTION',
    priority: 'URG',
    scheduledStart: '2026-04-16T10:30:00',
    scheduledEnd: '2026-04-16T12:00:00',
    createdAt: '2026-04-16T08:01:00',
    order: 0
  }
]

describe('Timeline', () => {
  it('should render time markers for business hours', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-16T10:00:00'))
    render(<Timeline tasks={mockTasks} />)
    expect(screen.getByText('06')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('18')).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('should render the sweep line (current time indicator)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-16T10:00:00'))
    render(<Timeline tasks={mockTasks} />)
    expect(screen.getByTestId('sweep-line')).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('should render task blocks for scheduled tasks', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-16T10:00:00'))
    render(<Timeline tasks={mockTasks} />)
    expect(screen.getByTestId('timeline-block-FS0001')).toBeInTheDocument()
    expect(screen.getByTestId('timeline-block-FS0002')).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('should not render blocks for tasks without scheduled time', () => {
    const unscheduledTask: Task = {
      id: 'FS0003',
      title: 'No Schedule',
      zone: 'HOLDING',
      priority: 'NRM',
      createdAt: '2026-04-16T08:00:00',
      order: 0
    }
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-16T10:00:00'))
    render(<Timeline tasks={[unscheduledTask]} />)
    expect(screen.queryByTestId('timeline-block-FS0003')).not.toBeInTheDocument()
    vi.useRealTimers()
  })

  it('should have correct data-testid', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-16T10:00:00'))
    render(<Timeline tasks={mockTasks} />)
    expect(screen.getByTestId('timeline')).toBeInTheDocument()
    vi.useRealTimers()
  })
})
