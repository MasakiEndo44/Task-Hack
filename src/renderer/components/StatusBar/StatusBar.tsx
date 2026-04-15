import type { ZoneType } from '../../types/task'
import styles from './StatusBar.module.css'

interface StatusBarProps {
  zoneCounts: Record<ZoneType, { total: number; urgent: number }>
}

const ZONE_LABELS: { zone: ZoneType; label: string; cssVar: string }[] = [
  { zone: 'ACTIVE', label: 'ACT', cssVar: '--zone-active' },
  { zone: 'NEXT_ACTION', label: 'NXT', cssVar: '--zone-next' },
  { zone: 'HOLDING', label: 'HLD', cssVar: '--zone-holding' },
  { zone: 'CLEARED', label: 'CLR', cssVar: '--zone-cleared' }
]

export function StatusBar({ zoneCounts }: StatusBarProps) {
  const totalUrgent = Object.values(zoneCounts).reduce(
    (sum, c) => sum + c.urgent,
    0
  )

  return (
    <div className={styles.statusBar} role="status" aria-label="タスクステータス">
      <div className={styles.zones}>
        {ZONE_LABELS.map(({ zone, label, cssVar }) => (
          <div
            key={zone}
            className={styles.zoneIndicator}
            style={{ '--indicator-color': `var(${cssVar})` } as React.CSSProperties}
          >
            <span className={styles.zoneLabel}>{label}</span>
            <span className={styles.zoneCount} data-testid={`count-${zone}`}>
              {zoneCounts[zone].total}
            </span>
          </div>
        ))}
      </div>
      <div className={styles.urgentIndicator}>
        <span className={styles.urgentLabel}>URG</span>
        <span className={styles.urgentCount} data-testid="count-urgent">
          {totalUrgent}
        </span>
      </div>
    </div>
  )
}
