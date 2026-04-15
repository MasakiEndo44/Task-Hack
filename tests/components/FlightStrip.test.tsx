import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FlightStrip } from '@renderer/components/FlightStrip/FlightStrip'
import type { Task } from '@renderer/types/task'

const mockTask: Task = {
  id: 'FS1234',
  title: 'メールチェックと重要メールリスト化',
  zone: 'NEXT_ACTION',
  priority: 'NRM',
  category: 'daily',
  scheduledStart: '2026-04-16T09:00:00',
  createdAt: '2026-04-16T08:00:00',
  order: 0
}

describe('FlightStrip', () => {
  it('should display flight ID', () => {
    render(<FlightStrip task={mockTask} onComplete={vi.fn()} />)
    expect(screen.getByText('FS1234')).toBeInTheDocument()
  })

  it('should display task title', () => {
    render(<FlightStrip task={mockTask} onComplete={vi.fn()} />)
    expect(screen.getByText('メールチェックと重要メールリスト化')).toBeInTheDocument()
  })

  it('should display priority badge', () => {
    render(<FlightStrip task={mockTask} onComplete={vi.fn()} />)
    expect(screen.getByText('NRM')).toBeInTheDocument()
  })

  it('should display URG priority badge with urgent styling', () => {
    const urgentTask = { ...mockTask, priority: 'URG' as const }
    render(<FlightStrip task={urgentTask} onComplete={vi.fn()} />)
    expect(screen.getByText('URG')).toBeInTheDocument()
  })

  it('should display scheduled time if present', () => {
    render(<FlightStrip task={mockTask} onComplete={vi.fn()} />)
    expect(screen.getByText('09:00')).toBeInTheDocument()
  })

  it('should display category if present', () => {
    render(<FlightStrip task={mockTask} onComplete={vi.fn()} />)
    expect(screen.getByText('daily')).toBeInTheDocument()
  })

  it('should call onComplete when complete button is clicked', () => {
    const onComplete = vi.fn()
    render(<FlightStrip task={mockTask} onComplete={onComplete} />)
    fireEvent.click(screen.getByRole('button', { name: /完了/i }))
    expect(onComplete).toHaveBeenCalledWith('FS1234')
  })

  it('should have the correct data-testid', () => {
    render(<FlightStrip task={mockTask} onComplete={vi.fn()} />)
    expect(screen.getByTestId('flight-strip-FS1234')).toBeInTheDocument()
  })
})
