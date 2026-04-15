import { useClock } from '../../hooks/useClock'
import type { Task } from '../../types/task'
import styles from './Timeline.module.css'

interface TimelineProps {
  tasks: Task[]
}

/** タイムライン表示時間帯 (6:00 - 24:00) */
const TIMELINE_START_HOUR = 6
const TIMELINE_END_HOUR = 24
const TOTAL_HOURS = TIMELINE_END_HOUR - TIMELINE_START_HOUR

/** 時刻を0-100のパーセンテージに変換 */
function timeToPercent(date: Date): number {
  const hours = date.getHours() + date.getMinutes() / 60
  const clamped = Math.max(TIMELINE_START_HOUR, Math.min(TIMELINE_END_HOUR, hours))
  return ((clamped - TIMELINE_START_HOUR) / TOTAL_HOURS) * 100
}

/** ゾーンに対応するCSS変数名 */
const ZONE_COLORS: Record<string, string> = {
  ACTIVE: 'var(--zone-active)',
  NEXT_ACTION: 'var(--zone-next)',
  HOLDING: 'var(--zone-holding)',
  CLEARED: 'var(--zone-cleared)'
}

export function Timeline({ tasks }: TimelineProps) {
  const { now } = useClock()
  const sweepPercent = timeToPercent(now)

  const scheduledTasks = tasks.filter(t => t.scheduledStart)

  const hourMarkers = Array.from(
    { length: TOTAL_HOURS + 1 },
    (_, i) => TIMELINE_START_HOUR + i
  )

  return (
    <div className={styles.timeline} data-testid="timeline">
      {/* 時間マーカー */}
      <div className={styles.markers}>
        {hourMarkers.map(hour => (
          <div
            key={hour}
            className={styles.marker}
            style={{ left: `${((hour - TIMELINE_START_HOUR) / TOTAL_HOURS) * 100}%` }}
          >
            <span className={styles.markerLabel}>
              {hour.toString().padStart(2, '0')}
            </span>
            <div className={styles.markerLine} />
          </div>
        ))}
      </div>

      {/* タスクブロック */}
      <div className={styles.blocks}>
        {scheduledTasks.map(task => {
          const start = new Date(task.scheduledStart!)
          const end = task.scheduledEnd
            ? new Date(task.scheduledEnd)
            : new Date(start.getTime() + 3600000) // デフォルト1時間
          const leftPercent = timeToPercent(start)
          const rightPercent = timeToPercent(end)
          const widthPercent = rightPercent - leftPercent

          return (
            <div
              key={task.id}
              className={styles.block}
              data-testid={`timeline-block-${task.id}`}
              style={{
                left: `${leftPercent}%`,
                width: `${Math.max(widthPercent, 1)}%`,
                '--block-color': ZONE_COLORS[task.zone] || 'var(--text-muted)'
              } as React.CSSProperties}
              title={`${task.id}: ${task.title}`}
            >
              <span className={styles.blockLabel}>{task.id}</span>
            </div>
          )
        })}
      </div>

      {/* スイープライン（現在時刻） */}
      <div
        className={styles.sweepLine}
        data-testid="sweep-line"
        style={{ left: `${sweepPercent}%` }}
      >
        <div className={styles.sweepDot} />
      </div>
    </div>
  )
}
