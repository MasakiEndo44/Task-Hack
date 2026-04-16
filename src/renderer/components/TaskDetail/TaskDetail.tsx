import { useState, useEffect } from 'react'
import type { Task } from '../../types/task'
import styles from './TaskDetail.module.css'

interface TaskDetailProps {
  task: Task
  onUpdate: (taskId: string, updates: Partial<Task>) => void
}

export function TaskDetail({ task, onUpdate }: TaskDetailProps) {
  const [estimatedTime, setEstimatedTime] = useState(task.estimatedTime || 25)
  const [notes, setNotes] = useState(task.notes || '')
  
  // taskが切り替わったら初期値をリセット
  useEffect(() => {
    setEstimatedTime(task.estimatedTime || 25)
    setNotes(task.notes || '')
  }, [task.id, task.estimatedTime, task.notes])

  // 変更を親のReducerに送るまでのデバウンス用（保存用）
  useEffect(() => {
    const timer = setTimeout(() => {
      const hasChanged = estimatedTime !== (task.estimatedTime || 25) || notes !== (task.notes || '')
      if (hasChanged) {
        onUpdate(task.id, {
          estimatedTime,
          notes
        })
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [estimatedTime, notes, task.id, task.estimatedTime, task.notes, onUpdate])

  return (
    <div className={styles.container}>
      {/* 優先度とカテゴリ（表示のみ、または後で編集可能にする） */}
      <div className={styles.metaRow}>
        <span className={`${styles.priorityBadge} ${task.priority === 'URG' ? styles.urgent : styles.normal}`}>
          {task.priority}
        </span>
        {task.category && <span className={styles.category}>{task.category}</span>}
      </div>

      <div className={styles.titleSection}>
        <h3 className={styles.title}>{task.title}</h3>
      </div>

      <div className={styles.section}>
        <label className={styles.label}>
          所要時間 (分): <span>{estimatedTime} 分</span>
        </label>
        <input
          type="range"
          min="5"
          max="120"
          step="5"
          value={estimatedTime}
          onChange={(e) => setEstimatedTime(Number(e.target.value))}
          className={styles.slider}
        />
      </div>

      <div className={styles.section}>
        <label className={styles.label}>メモ</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="タスクに関するメモやリンクなどをここに記述..."
          className={styles.textarea}
        />
      </div>
      
      {/* サブタスク等は将来的に拡張 */}
    </div>
  )
}
