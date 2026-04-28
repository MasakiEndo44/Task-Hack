import { useTimer } from '../../hooks/useTimer'
import type { TimerCallbacks } from '../../hooks/useTimer'
import styles from './Timer.module.css'

interface TimerProps {
  initialMinutes?: number
  taskTitle?: string
  callbacks?: TimerCallbacks
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function Timer({ initialMinutes = 25, taskTitle = '', callbacks }: TimerProps) {
  const { state, elapsedTime, totalSeconds, progress, start, pause, reset } = useTimer(initialMinutes, callbacks, taskTitle)

  return (
    <div className={`${styles.timer} ${styles[state]}`}>
      <div className={styles.display}>
        <span className={styles.time}>
          {formatTime(elapsedTime)}
          <span className={styles.timeSeparator}> / </span>
          {formatTime(totalSeconds)}
        </span>
        <div className={styles.controls}>
          {state === 'idle' || state === 'paused' ? (
            <button onClick={start} className={styles.button} aria-label="スタート">
              ▶
            </button>
          ) : (
            <button onClick={pause} className={styles.button} aria-label="一時停止">
              ‖
            </button>
          )}
          <button onClick={() => reset(initialMinutes)} className={styles.button} aria-label="リセット">
            ↺
          </button>
        </div>
      </div>
      
      <div className={styles.progressContainer}>
        <div 
          className={styles.progressBar} 
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      
      {state === 'wrapup' && (
        <div className={styles.wrapupMessage}>
          終了まであと少し。延長しますか？
        </div>
      )}
    </div>
  )
}
