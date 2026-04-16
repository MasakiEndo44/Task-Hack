import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBar } from '@renderer/components/StatusBar/StatusBar'
import type { ZoneType } from '@renderer/types/task'

const mockCounts: Record<ZoneType, { total: number; urgent: number }> = {
  ACTIVE: { total: 1, urgent: 1 },
  NEXT_ACTION: { total: 3, urgent: 1 },
  HOLDING: { total: 5, urgent: 0 },
  CLEARED: { total: 2, urgent: 0 }
}

describe('StatusBar', () => {
  it('should display app title', () => {
    render(<StatusBar zoneCounts={mockCounts} />)
    expect(screen.getByText('Task-Hack')).toBeInTheDocument()
  })

  it('should display zone labels with colon', () => {
    render(<StatusBar zoneCounts={mockCounts} />)
    expect(screen.getByText('ACT:')).toBeInTheDocument()
    expect(screen.getByText('NXT:')).toBeInTheDocument()
    expect(screen.getByText('HLD:')).toBeInTheDocument()
    expect(screen.getByText('CLR:')).toBeInTheDocument()
  })

  it('should display total count for each zone', () => {
    render(<StatusBar zoneCounts={mockCounts} />)
    expect(screen.getByTestId('count-ACTIVE')).toHaveTextContent('1')
    expect(screen.getByTestId('count-NEXT_ACTION')).toHaveTextContent('3')
    expect(screen.getByTestId('count-HOLDING')).toHaveTextContent('5')
    expect(screen.getByTestId('count-CLEARED')).toHaveTextContent('2')
  })

  it('should display total urgent count', () => {
    render(<StatusBar zoneCounts={mockCounts} />)
    expect(screen.getByTestId('count-urgent')).toHaveTextContent('2')
  })

  it('should have aria role status for accessibility', () => {
    render(<StatusBar zoneCounts={mockCounts} />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
