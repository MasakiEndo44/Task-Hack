import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useClock } from '@renderer/hooks/useClock'

describe('useClock', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return current time as formatted string (HH:MM:SS)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-16T14:30:45'))
    const { result } = renderHook(() => useClock())
    expect(result.current.timeString).toBe('14:30:45')
  })

  it('should return current Date object', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-16T14:30:45'))
    const { result } = renderHook(() => useClock())
    expect(result.current.now).toBeInstanceOf(Date)
  })

  it('should update every second', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-16T14:30:45'))
    const { result } = renderHook(() => useClock())
    expect(result.current.timeString).toBe('14:30:45')

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.timeString).toBe('14:30:46')
  })
})
