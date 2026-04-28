import type { Task } from '../../types/task'
import styles from './FlightStrip.module.css'

function formatScheduledDate(iso?: string): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' })
}

interface FlightStripProps {
  task: Task
  onComplete: (taskId: string) => void
  onUndo?: (taskId: string) => void
  onClick?: (taskId: string) => void
  isDragging?: boolean
  isBlocked?: boolean
  isFilteredOut?: boolean
}

export function FlightStrip({ task, onComplete, onUndo, onClick, isDragging = false, isBlocked = false, isFilteredOut = false }: FlightStripProps) {
  const scheduledDate = formatScheduledDate(task.scheduledStart)
  const isUrgent = task.priority === 'URG'
  const isCleared = task.zone === 'CLEARED'
  const needsClarification = !task.scheduledStart && !task.notes && task.zone !== 'CLEARED'

  return (
    <div
      className={`${styles.strip} ${styles[task.zone.toLowerCase()]} ${isDragging ? styles.dragging : ''} ${isFilteredOut ? styles.filteredOut : ''}`}
      data-testid={`flight-strip-${task.id}`}
      onClick={() => onClick?.(task.id)}
    >
      {/* 上段: フライトID + 時刻 + 優先度バッジ + 依存ブロックインジケーター */}
      <div className={styles.topRow}>
        <span className={styles.flightId}>{task.id}</span>
        {scheduledDate && (
          <span className={styles.time}>{scheduledDate}</span>
        )}
        {needsClarification && (
          <span className={styles.clarificationBadge} title="Echoが質問を持っています">◈</span>
        )}
        {isBlocked && (
          <span className={styles.blockedIndicator} title="前提タスクが未完了です">🔗</span>
        )}
        <span className={`${styles.priorityBadge} ${isUrgent ? styles.urgent : styles.normal}`}>
          {task.priority}
        </span>
      </div>

      {/* 下段: タイトル + カテゴリ + DONE/UNDO */}
      <div className={styles.bottomRow}>
        <div className={styles.infoSection}>
          <span className={styles.title}>{task.title}</span>
          <div className={styles.metaRow}>
            {task.category && (
              <span className={styles.category}>{task.category}</span>
            )}
            {task.subtasks && task.subtasks.length > 0 && (
              <div className={styles.subtasksIndicator}>
                {task.subtasks.map(st => (
                  <span key={st.id} className={styles.subtaskIconContainer} title={st.title}>
                    {st.completed ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={styles.subtaskCompleted}>
                        <circle cx="12" cy="12" r="10" />
                        <path d="M7 12l3.5 3.5L18 8" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={styles.subtaskPending}>
                        <circle cx="12" cy="12" r="10" />
                      </svg>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {isCleared && onUndo ? (
          <button
            className={styles.undoButton}
            onClick={(e) => {
              e.stopPropagation()
              onUndo(task.id)
            }}
            aria-label="元に戻す"
            title="完了を取り消す"
          >
            <span className={styles.undoIcon}>↩</span>
            <span className={styles.undoText}>UNDO</span>
          </button>
        ) : (
          <button
            className={styles.completeButton}
            onClick={(e) => {
              e.stopPropagation()
              onComplete(task.id)
            }}
            aria-label="完了"
            title="タスクを完了する"
          >
            <span className={styles.doneIcon}>✓</span>
            <span className={styles.doneText}>DONE</span>
          </button>
        )}
      </div>
    </div>
  )
}
