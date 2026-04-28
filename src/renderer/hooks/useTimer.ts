import { useState, useEffect, useCallback, useRef } from 'react'

export type TimerState = 'idle' | 'running' | 'paused' | 'wrapup'

export interface TimerCallbacks {
  onStart?: (taskTitle: string) => void
  /** 50%地点でのチェックイン。デフォルトOFF（呼び出し元が明示的に提供した場合のみ動作） */
  onMidpoint?: (taskTitle: string, remainingMin: number) => void
  onWrapup?: (taskTitle: string) => void
  onComplete?: (taskTitle: string) => void
}

interface UseTimerResult {
  state: TimerState
  remainingTime: number
  elapsedTime: number
  totalSeconds: number
  progress: number
  start: () => void
  pause: () => void
  reset: (minutes: number) => void
}

export function useTimer(
  initialMinutes: number = 25,
  callbacks?: TimerCallbacks,
  activeTaskTitle: string = ''
): UseTimerResult {
  const [totalSeconds, setTotalSeconds] = useState(initialMinutes * 60)
  const [remainingTime, setRemainingTime] = useState(initialMinutes * 60)
  const [state, setState] = useState<TimerState>('idle')

  // stale closure防止: 常に最新のcallbacksとtaskTitleをRefで保持
  const callbacksRef = useRef(callbacks)
  const taskTitleRef = useRef(activeTaskTitle)
  callbacksRef.current = callbacks
  taskTitleRef.current = activeTaskTitle

  const midpointTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevStateRef = useRef<TimerState>('idle')

  useEffect(() => {
    if (state === 'idle') {
      const seconds = initialMinutes * 60
      setTotalSeconds(seconds)
      setRemainingTime(seconds)
    }
  }, [initialMinutes, state])

  // コールバック発火: state遷移時
  useEffect(() => {
    const prev = prevStateRef.current
    prevStateRef.current = state

    if (state === 'running' && prev !== 'running') {
      callbacksRef.current?.onStart?.(taskTitleRef.current)

      // 50%チェックイン（onMidpointが明示的に提供された場合のみ）
      if (callbacksRef.current?.onMidpoint) {
        if (midpointTimerRef.current) clearTimeout(midpointTimerRef.current)
        // remainingTimeはこの時点の値をクロージャで捕捉する必要がある
        // setRemainingTimeで最新値を取得
        setRemainingTime(current => {
          const halfMs = (current / 2) * 1000
          midpointTimerRef.current = setTimeout(() => {
            const rem = Math.floor(current / 2 / 60)
            callbacksRef.current?.onMidpoint?.(taskTitleRef.current, rem)
          }, halfMs)
          return current
        })
      }
    }

    if (state === 'wrapup' && prev === 'running') {
      if (midpointTimerRef.current) {
        clearTimeout(midpointTimerRef.current)
        midpointTimerRef.current = null
      }
      callbacksRef.current?.onWrapup?.(taskTitleRef.current)
    }

    if (state === 'idle' && (prev === 'running' || prev === 'wrapup')) {
      callbacksRef.current?.onComplete?.(taskTitleRef.current)
    }
  }, [state])

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (midpointTimerRef.current) clearTimeout(midpointTimerRef.current)
    }
  }, [])

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
    if (midpointTimerRef.current) {
      clearTimeout(midpointTimerRef.current)
      midpointTimerRef.current = null
    }
    setState('idle')
    const seconds = minutes * 60
    setTotalSeconds(seconds)
    setRemainingTime(seconds)
  }, [])

  const elapsedTime = totalSeconds - remainingTime
  const progress = totalSeconds > 0 ? elapsedTime / totalSeconds : 0

  return { state, remainingTime, elapsedTime, totalSeconds, progress, start, pause, reset }
}
