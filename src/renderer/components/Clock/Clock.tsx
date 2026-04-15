import { useClock } from '../../hooks/useClock'
import styles from './Clock.module.css'

export function Clock() {
  const { timeString } = useClock()

  return (
    <div className={styles.clock} role="timer" aria-label="現在時刻">
      <span className={styles.time}>{timeString}</span>
    </div>
  )
}
