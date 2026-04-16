import React, { useState } from 'react'
import type { TaskInput, ZoneType, Priority } from '../../types/task'
import styles from './TaskProposal.module.css'

export interface TaskProposalProps {
  taskStr: string
  onApprove: (task: TaskInput) => void
}

export const TaskProposal: React.FC<TaskProposalProps> = ({ taskStr, onApprove }) => {
  const [approved, setApproved] = useState(false)
  let taskData: Partial<TaskInput> | null = null
  
  try {
    taskData = JSON.parse(taskStr)
  } catch (e) {
    return null
  }
  
  if (!taskData || !taskData.title) return null

  const handleApprove = () => {
    onApprove({
      title: taskData.title || 'No Title',
      description: taskData.description || '',
      estimatedTime: taskData.estimatedTime,
      zone: (taskData.zone as ZoneType) || 'NEXT_ACTION',
      priority: (taskData.priority as Priority) || 'NRM',
      subtasks: taskData.subtasks || []
    })
    setApproved(true)
  }

  return (
    <div className={styles.proposalCard}>
      <div className={styles.header}>
        <span className={styles.badge}>提案</span>
        <h4>{taskData.title}</h4>
      </div>
      {taskData.description && <p className={styles.desc}>{taskData.description}</p>}
      
      {taskData.subtasks && taskData.subtasks.length > 0 && (
        <ul className={styles.subtasks}>
          {taskData.subtasks.map((st, i) => (
            <li key={i}>・{st.title}</li>
          ))}
        </ul>
      )}
      
      <div className={styles.actions}>
        <button 
          className={styles.approveBtn} 
          onClick={handleApprove} 
          disabled={approved}
        >
          {approved ? 'Approved ✓' : 'Approve & Add'}
        </button>
      </div>
    </div>
  )
}
