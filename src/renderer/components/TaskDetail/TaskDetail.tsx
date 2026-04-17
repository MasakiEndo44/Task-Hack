import { useState, useEffect } from 'react'
import type { Task, RecurrenceFrequency } from '../../types/task'
import styles from './TaskDetail.module.css'

interface TaskDetailProps {
  task: Task
  onUpdate: (taskId: string, updates: Partial<Task>) => void
}

export function TaskDetail({ task, onUpdate }: TaskDetailProps) {
  const [estimatedTime, setEstimatedTime] = useState(task.estimatedTime || 25)
  const [notes, setNotes] = useState(task.notes || '')
  const [scheduledStartDate, setScheduledStartDate] = useState(task.scheduledStart ? task.scheduledStart.split('T')[0] : '')
  const [subtasks, setSubtasks] = useState(task.subtasks || [])
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [recurrenceFreq, setRecurrenceFreq] = useState<RecurrenceFrequency | ''>(task.recurrence?.frequency ?? '')
  const [recurrenceDayOfWeek, setRecurrenceDayOfWeek] = useState(task.recurrence?.dayOfWeek ?? 1)
  const [recurrenceDayOfMonth, setRecurrenceDayOfMonth] = useState(task.recurrence?.dayOfMonth ?? 1)

  // taskが切り替わったら初期値をリセット
  useEffect(() => {
    setEstimatedTime(task.estimatedTime || 25)
    setNotes(task.notes || '')
    setScheduledStartDate(task.scheduledStart ? task.scheduledStart.split('T')[0] : '')
    setSubtasks(task.subtasks || [])
    setNewSubtaskTitle('')
    setRecurrenceFreq(task.recurrence?.frequency ?? '')
    setRecurrenceDayOfWeek(task.recurrence?.dayOfWeek ?? 1)
    setRecurrenceDayOfMonth(task.recurrence?.dayOfMonth ?? 1)
  }, [task.id, task.estimatedTime, task.notes, task.scheduledStart, task.subtasks, task.recurrence])

  const handleToggleSubtask = (id: string) => {
    const newSubtasks = subtasks.map(st => st.id === id ? { ...st, completed: !st.completed } : st)
    setSubtasks(newSubtasks)
    onUpdate(task.id, { subtasks: newSubtasks })
  }
  
  const handleEditSubtask = (id: string, title: string) => {
    setSubtasks(prev => prev.map(st => st.id === id ? { ...st, title } : st))
  }
  
  const handleDeleteSubtask = (id: string) => {
    const newSubtasks = subtasks.filter(st => st.id !== id)
    setSubtasks(newSubtasks)
    onUpdate(task.id, { subtasks: newSubtasks })
  }
  
  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim() || subtasks.length >= 3) return;
    const newId = 'st-' + Math.random().toString(36).substring(2, 9)
    const newSubtasks = [...subtasks, { id: newId, title: newSubtaskTitle.trim(), completed: false }]
    setSubtasks(newSubtasks)
    setNewSubtaskTitle('')
    onUpdate(task.id, { subtasks: newSubtasks })
  }

  // 変更を親のReducerに送るまでのデバウンス用（保存用）
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentStart = task.scheduledStart ? task.scheduledStart.split('T')[0] : ''
      const subtasksChanged = JSON.stringify(subtasks) !== JSON.stringify(task.subtasks || [])
      const currentRecurrenceFreq = task.recurrence?.frequency ?? ''
      const recurrenceChanged = recurrenceFreq !== currentRecurrenceFreq ||
        (recurrenceFreq === 'weekly' && recurrenceDayOfWeek !== (task.recurrence?.dayOfWeek ?? 1)) ||
        (recurrenceFreq === 'monthly' && recurrenceDayOfMonth !== (task.recurrence?.dayOfMonth ?? 1))
      const hasChanged = estimatedTime !== (task.estimatedTime || 25) ||
                         notes !== (task.notes || '') ||
                         scheduledStartDate !== currentStart ||
                         subtasksChanged ||
                         recurrenceChanged

      if (hasChanged) {
        let newScheduledStart = task.scheduledStart
        if (scheduledStartDate !== currentStart) {
          if (!scheduledStartDate) {
            newScheduledStart = undefined
          } else {
            const timePart = task.scheduledStart ? task.scheduledStart.split('T')[1] : '09:00:00'
            newScheduledStart = `${scheduledStartDate}T${timePart}`
          }
        }

        const newRecurrence = recurrenceFreq
          ? {
              frequency: recurrenceFreq,
              ...(recurrenceFreq === 'weekly' ? { dayOfWeek: recurrenceDayOfWeek } : {}),
              ...(recurrenceFreq === 'monthly' ? { dayOfMonth: recurrenceDayOfMonth } : {}),
              lastGeneratedAt: task.recurrence?.lastGeneratedAt,
            }
          : undefined

        onUpdate(task.id, {
          estimatedTime,
          notes,
          scheduledStart: newScheduledStart,
          subtasks,
          recurrence: newRecurrence,
        })
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [estimatedTime, notes, scheduledStartDate, subtasks, recurrenceFreq, recurrenceDayOfWeek, recurrenceDayOfMonth, task.id, task.estimatedTime, task.notes, task.scheduledStart, task.subtasks, task.recurrence, onUpdate])

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
        <label className={styles.label}>着手予定日</label>
        <input
          type="date"
          value={scheduledStartDate}
          onChange={(e) => setScheduledStartDate(e.target.value)}
          className={styles.dateInput}
        />
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
      
      <div className={styles.section}>
        <label className={styles.label}>サブタスク (最大3つ)</label>
        <div className={styles.subtasksList}>
          {subtasks.map((st) => (
            <div key={st.id} className={styles.subtaskItem}>
              <input 
                type="checkbox" 
                checked={st.completed}
                onChange={() => handleToggleSubtask(st.id)}
                className={styles.subtaskCheckbox}
              />
              <input
                type="text"
                value={st.title}
                onChange={(e) => handleEditSubtask(st.id, e.target.value)}
                onBlur={() => onUpdate(task.id, { subtasks })}
                className={`${styles.subtaskInput} ${st.completed ? styles.completedSubtask : ''}`}
              />
              <button onClick={() => handleDeleteSubtask(st.id)} className={styles.deleteSubtaskBtn} title="削除">✕</button>
            </div>
          ))}
        </div>
        {subtasks.length < 3 && (
          <div className={styles.addSubtaskContainer}>
            <input
              type="text"
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
              placeholder="+ サブタスクを追加 (Enterで確定)"
              className={styles.addSubtaskInput}
            />
            <button onClick={handleAddSubtask} className={styles.addSubtaskBtn} disabled={!newSubtaskTitle.trim()}>
              追加
            </button>
          </div>
        )}
      </div>

      <div className={styles.section}>
        <label className={styles.label}>🔁 繰り返し</label>
        <select
          value={recurrenceFreq}
          onChange={e => setRecurrenceFreq(e.target.value as RecurrenceFrequency | '')}
          className={styles.select}
        >
          <option value="">なし</option>
          <option value="daily">毎日</option>
          <option value="weekly">毎週</option>
          <option value="monthly">毎月</option>
        </select>
        {recurrenceFreq === 'weekly' && (
          <select
            value={recurrenceDayOfWeek}
            onChange={e => setRecurrenceDayOfWeek(Number(e.target.value))}
            className={styles.select}
          >
            {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
              <option key={i} value={i}>{d}曜日</option>
            ))}
          </select>
        )}
        {recurrenceFreq === 'monthly' && (
          <select
            value={recurrenceDayOfMonth}
            onChange={e => setRecurrenceDayOfMonth(Number(e.target.value))}
            className={styles.select}
          >
            {Array.from({ length: 31 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{i + 1}日</option>
            ))}
          </select>
        )}
      </div>
    </div>
  )
}
