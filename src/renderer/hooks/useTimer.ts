import { useState, useEffect, useCallback } from 'react'

export type TimerState = 'idle' | 'running' | 'paused' | 'wrapup'

interface UseTimerResult {
  state: TimerState
  remainingTime: number
  progress: number
  start: () => void
  pause: () => void
  reset: (minutes: number) => void
}

export function useTimer(initialMinutes: number = 25): UseTimerResult {
  const [totalSeconds, setTotalSeconds] = useState(initialMinutes * 60)
  const [remainingTime, setRemainingTime] = useState(initialMinutes * 60)
  const [state, setState] = useState<TimerState>('idle')

  useEffect(() => {
    if (state === 'idle') {
      const seconds = initialMinutes * 60
      setTotalSeconds(seconds)
      setRemainingTime(seconds)
    }
  }, [initialMinutes, state])

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null

    if (state === 'running' || state === 'wrapup') {
      interval = setInterval(() => {
        setRemainingTime((prev) => {
          if (prev <= 1) {
            setState('idle')
            return 0
          }
          const next = prev - 1
          if (next <= 120 && state === 'running') {
            setState('wrapup')
          }
          return next
        })
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [state])

  const start = useCallback(() => {
    if (remainingTime > 0) {
      if (remainingTime <= 120) {
        setState('wrapup')
      } else {
        setState('running')
      }
    }
  }, [remainingTime])

  const pause = useCallback(() => {
    if (state === 'running' || state === 'wrapup') {
      setState('paused')
    }
  }, [state])

  const reset = useCallback((minutes: number) => {
    setState('idle')
    const seconds = minutes * 60
    setTotalSeconds(seconds)
    setRemainingTime(seconds)
  }, [])

  const progress = totalSeconds > 0 ? (totalSeconds - remainingTime) / totalSeconds : 0

  return { state, remainingTime, progress, start, pause, reset }
}
