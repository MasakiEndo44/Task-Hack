import React, { useState } from 'react'
import type { TaskInput, Priority } from '../../types/task'
import styles from './TaskProposal.module.css'

interface ProposedSubtask {
  title: string
}

interface ProposedTask {
  title: string
  estimatedMinutes: number
  priority: Priority
  scheduledStart?: string
  subtasks?: ProposedSubtask[]
  notes?: string
}

interface ProposedPayload {
  tasks: ProposedTask[]
}

export interface TaskProposalProps {
  taskStr: string
  onApprove: (task: TaskInput) => void
}

function formatTime(min: number): string {
  if (min >= 60) {
    const h = Math.floor(min / 60)
    const m = min % 60
    return m > 0 ? `${h}h${m}m` : `${h}h`
  }
  return `${min}m`
}

function formatScheduledStart(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }) + ' 着手'
  } catch {
    return iso
  }
}

export const TaskProposal: React.FC<TaskProposalProps> = ({ taskStr, onApprove }) => {
  const [approvedIndices, setApprovedIndices] = useState<Set<number>>(new Set())
  const [allApproved, setAllApproved] = useState(false)

  let payload: ProposedPayload | null = null
  try {
    const parsed = JSON.parse(taskStr)
    if (Array.isArray(parsed.tasks)) {
      payload = parsed as ProposedPayload
    } else if (parsed.title) {
      // legacy single-task format
      payload = {
        tasks: [{
          title: parsed.title,
          estimatedMinutes: parsed.estimatedTime || 60,
          priority: (parsed.priority as Priority) || 'NRM',
          notes: parsed.description
        }]
      }
    }
  } catch {
    return null
  }

  if (!payload || payload.tasks.length === 0) return null

  const buildTaskInput = (t: ProposedTask): TaskInput => ({
    title: t.title,
    zone: 'NEXT_ACTION',
    priority: t.priority || 'NRM',
    estimatedTime: t.estimatedMinutes,
    scheduledStart: t.scheduledStart,
    notes: t.notes,
    subtasks: t.subtasks?.map((st, i) => ({
      id: `st-${Date.now()}-${i}`,
      title: st.title,
      completed: false
    })) ?? [],
  })

  const handleApproveOne = (index: number) => {
    onApprove(buildTaskInput(payload!.tasks[index]))
    setApprovedIndices(prev => new Set(prev).add(index))
  }

  const handleApproveAll = () => {
    payload!.tasks.forEach((t, i) => {
      if (!approvedIndices.has(i)) onApprove(buildTaskInput(t))
    })
    setAllApproved(true)
  }

  const totalMinutes = payload.tasks.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0)

  return (
    <div className={styles.proposalCard}>
      <div className={styles.header}>
        <span className={styles.badge}>提案</span>
        <span className={styles.totalTime}>合計 {formatTime(totalMinutes)}</span>
      </div>

      <ul className={styles.taskList}>
        {payload.tasks.map((t, i) => {
          const done = allApproved || approvedIndices.has(i)
          return (
            <li key={i} className={`${styles.taskItem} ${done ? styles.taskDone : ''}`}>
              <div className={styles.taskHeader}>
                <div className={styles.taskMeta}>
                  <span className={`${styles.priority} ${t.priority === 'URG' ? styles.urg : styles.nrm}`}>
                    {t.priority}
                  </span>
                  <span className={styles.taskTitle}>{t.title}</span>
                  <span className={styles.est}>{formatTime(t.estimatedMinutes)}</span>
                </div>
                <button
                  className={styles.approveOneBtn}
                  onClick={() => handleApproveOne(i)}
                  disabled={done}
                >
                  {done ? '✓ 追加済み' : '+ 追加'}
                </button>
              </div>

              {(t.scheduledStart || t.notes || (t.subtasks && t.subtasks.length > 0)) && (
                <div className={styles.taskDetail}>
                  {t.scheduledStart && (
                    <div className={styles.scheduledStart}>
                      📅 {formatScheduledStart(t.scheduledStart)}
                    </div>
                  )}
                  {t.subtasks && t.subtasks.length > 0 && (
                    <ul className={styles.subtasks}>
                      {t.subtasks.slice(0, 3).map((st, j) => (
                        <li key={j}>· {st.title}</li>
                      ))}
                    </ul>
                  )}
                  {t.notes && (
                    <div className={styles.notes}>💬 {t.notes}</div>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {payload.tasks.length > 1 && (
        <div className={styles.actions}>
          <button
            className={styles.approveBtn}
            onClick={handleApproveAll}
            disabled={allApproved}
          >
            {allApproved ? 'すべて追加済み ✓' : `全${payload.tasks.length}件を追加`}
          </button>
        </div>
      )}
    </div>
  )
}
