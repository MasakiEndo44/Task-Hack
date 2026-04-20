import { useState, useEffect } from 'react'
import { useClock } from '../../hooks/useClock'
import type { Task } from '../../types/task'
import { ReportHistory } from '../ReportHistory/ReportHistory'
import styles from './Timeline.module.css'

interface TimelineProps {
  tasks: Task[]
  defaultTab?: 'today' | 'history'
  onRegisterTabSetter?: (fn: (tab: 'today' | 'history') => void) => void
}

/** ゾーンに対応するCSS変数名 */
const ZONE_COLORS: Record<string, string> = {
  ACTIVE: 'var(--zone-active)',
  NEXT_ACTION: 'var(--zone-next)',
  HOLDING: 'var(--zone-holding)',
  CLEARED: 'var(--zone-cleared)'
}

const isSameDay = (d1: Date, d2: Date) => 
  d1.getFullYear() === d2.getFullYear() && 
  d1.getMonth() === d2.getMonth() && 
  d1.getDate() === d2.getDate();

function getWeekDates(now: Date): Date[] {
  const current = new Date(now);
  current.setHours(0,0,0,0);
  const dates: Date[] = [];
  const day = current.getDay();
  const diffToMonday = current.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(current);
  monday.setDate(diffToMonday);
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function getMonthDates(now: Date): Date[] {
  const year = now.getFullYear();
  const month = now.getMonth();
  const numDays = new Date(year, month + 1, 0).getDate();
  const dates: Date[] = [];
  for (let i = 1; i <= numDays; i++) {
    dates.push(new Date(year, month, i, 0, 0, 0, 0));
  }
  return dates;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function Timeline({ tasks, defaultTab = 'today', onRegisterTabSetter }: TimelineProps) {
  const [panelTab, setPanelTab] = useState<'today' | 'history'>(defaultTab)

  useEffect(() => {
    onRegisterTabSetter?.(setPanelTab)
  }, [onRegisterTabSetter])
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week')
  const { now } = useClock()

  const dates = viewMode === 'week' ? getWeekDates(now) : getMonthDates(now);
  const scheduledTasks = tasks.filter(t => t.scheduledStart);

  const sweepPercent = (() => {
    const totalDays = dates.length;
    const todayIndex = dates.findIndex(d => isSameDay(d, now));
    if (todayIndex === -1) return -100;
    const percentOfDay = (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 86400;
    return ((todayIndex + percentOfDay) / totalDays) * 100;
  })()

  return (
    <div className={styles.timelineContainer}>
      <div className={styles.timelineHeader}>
        <div className={styles.timelineHeaderLeft}>
          <span className={styles.timelineIcon}>◆</span>
          <span className={styles.timelineTitle}>TIMELINE</span>
          <div className={styles.panelTabs}>
            <button
              className={`${styles.panelTab} ${panelTab === 'today' ? styles.panelTabActive : ''}`}
              onClick={() => setPanelTab('today')}
            >
              今日
            </button>
            <button
              className={`${styles.panelTab} ${panelTab === 'history' ? styles.panelTabActive : ''}`}
              onClick={() => setPanelTab('history')}
            >
              📋 履歴
            </button>
          </div>
        </div>
        {panelTab === 'today' && (
          <div className={styles.viewToggles}>
            <button
              className={`${styles.toggleBtn} ${viewMode === 'week' ? styles.active : ''}`}
              onClick={() => setViewMode('week')}
            >
              Week
            </button>
            <button
              className={`${styles.toggleBtn} ${viewMode === 'month' ? styles.active : ''}`}
              onClick={() => setViewMode('month')}
            >
              Month
            </button>
          </div>
        )}
      </div>

      {panelTab === 'history' && (
        <div className={styles.historyPanel}>
          <ReportHistory />
        </div>
      )}

      {panelTab === 'today' && (
      <div className={styles.timeline} data-testid="timeline">
        {/* 日付マーカー */}
        <div className={styles.markers}>
          {dates.map((date, i) => (
            <div
              key={i}
              className={`${styles.marker} ${isSameDay(date, now) ? styles.markerToday : ''}`}
              style={{ left: `${(i / dates.length) * 100}%`, width: `${100 / dates.length}%` }}
            >
              <div className={styles.markerLabelGroup}>
                {viewMode === 'week' && (
                  <span className={styles.markerDayName}>
                    {DAY_NAMES[date.getDay()]}
                  </span>
                )}
                <span className={styles.markerDate}>
                  {date.getDate()}
                </span>
              </div>
              <div className={styles.markerLine} />
            </div>
          ))}
        </div>

        {/* タスクブロック群 */}
        <div className={styles.blocks}>
          {dates.map((date, index) => {
             const dayTasks = scheduledTasks.filter(t => isSameDay(new Date(t.scheduledStart!), date));
             if (dayTasks.length === 0) return null;
             
             return (
                <div 
                  key={index} 
                  className={styles.dayTaskContainer} 
                  style={{ left: `${(index / dates.length) * 100}%`, width: `${100 / dates.length}%` }}
                >
                   {dayTasks.map(task => (
                      <div 
                        key={task.id} 
                        className={styles.block} 
                        style={{ '--block-color': ZONE_COLORS[task.zone] || 'var(--text-muted)' } as React.CSSProperties}
                        title={`${task.id}: ${task.title}`}
                      >
                         <span className={styles.blockDot}>●</span>
                         {viewMode === 'week' && <span className={styles.blockLabel}>{task.id}</span>}
                      </div>
                   ))}
                </div>
             )
          })}
        </div>

        {/* スイープライン（現在時刻進行度） */}
        {sweepPercent >= 0 && sweepPercent <= 100 && (
          <div
            className={styles.sweepLine}
            data-testid="sweep-line"
            style={{ left: `${sweepPercent}%` }}
          >
            <div className={styles.sweepDot} />
          </div>
        )}
      </div>
      )}
    </div>
  )
}
