import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Clock } from '@renderer/components/Clock/Clock'

describe('Clock', () => {
  it('should render time in digital clock format', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-16T14:30:45'))
    render(<Clock />)
    expect(screen.getByText('14:30:45')).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('should have role="timer" for accessibility', () => {
    render(<Clock />)
    expect(screen.getByRole('timer')).toBeInTheDocument()
  })
})
