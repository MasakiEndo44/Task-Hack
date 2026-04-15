import type { Task } from '../../types/task'
import styles from './FlightStrip.module.css'

interface FlightStripProps {
  task: Task
  onComplete: (taskId: string) => void
  isDragging?: boolean
}

function formatScheduledTime(iso?: string): string | null {
  if (!iso) return null
  const date = new Date(iso)
  return date.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

export function FlightStrip({ task, onComplete, isDragging = false }: FlightStripProps) {
  const scheduledTime = formatScheduledTime(task.scheduledStart)
  const isUrgent = task.priority === 'URG'

  return (
    <div
      className={`${styles.strip} ${styles[task.zone.toLowerCase()]} ${isDragging ? styles.dragging : ''}`}
      data-testid={`flight-strip-${task.id}`}
    >
      {/* 左: フライトID */}
      <div className={styles.idSection}>
        <span className={styles.flightId}>{task.id}</span>
        {scheduledTime && (
          <span className={styles.time}>{scheduledTime}</span>
        )}
      </div>

      {/* 中央: タイトル + カテゴリ */}
      <div className={styles.infoSection}>
        <span className={styles.title}>{task.title}</span>
        {task.category && (
          <span className={styles.category}>{task.category}</span>
        )}
      </div>

      {/* 右: 優先度バッジ + 完了ボタン */}
      <div className={styles.actionSection}>
        <span className={`${styles.priorityBadge} ${isUrgent ? styles.urgent : styles.normal}`}>
          {task.priority}
        </span>
        <button
          className={styles.completeButton}
          onClick={() => onComplete(task.id)}
          aria-label="完了"
          title="タスクを完了する"
        >
          ✓
        </button>
      </div>
    </div>
  )
}
