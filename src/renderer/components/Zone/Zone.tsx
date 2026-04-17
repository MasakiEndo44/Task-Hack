import { useCallback } from 'react'
import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Task, ZoneType } from '../../types/task'
import type { TimerCallbacks } from '../../hooks/useTimer'
import { FlightStrip } from '../FlightStrip/FlightStrip'
import { Timer } from '../Timer/Timer'
import styles from './Zone.module.css'

interface ZoneProps {
  zone: ZoneType
  title: string
  subtitle?: string
  icon?: string
  tasks: Task[]
  maxTasks: number
  onComplete: (taskId: string) => void
  onUndo?: (taskId: string) => void
  onClickTask?: (taskId: string) => void
  defaultTimer?: number
  onTimerEvent?: (event: 'start' | 'wrapup' | 'complete', taskTitle: string, remainingMin?: number) => void
  onSuggestPriority?: () => void
  blockedTaskIds?: Set<string>
}

function SortableFlightStrip({
  task,
  onComplete,
  onUndo,
  onClick,
  isBlocked
}: {
  task: Task
  onComplete: (taskId: string) => void
  onUndo?: (taskId: string) => void
  onClick?: (taskId: string) => void
  isBlocked?: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      onClick={() => onClick?.(task.id)}
    >
      <FlightStrip task={task} onComplete={onComplete} onUndo={onUndo} isDragging={isDragging} isBlocked={isBlocked} />
    </div>
  )
}

export function Zone({ zone, title, subtitle, icon, tasks, maxTasks, onComplete, onUndo, onClickTask, defaultTimer = 25, onTimerEvent, onSuggestPriority, blockedTaskIds }: ZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id: zone })

  const timerCallbacks: TimerCallbacks | undefined = onTimerEvent ? {
    onStart: (taskTitle) => onTimerEvent('start', taskTitle),
    onWrapup: (taskTitle) => onTimerEvent('wrapup', taskTitle),
    onComplete: (taskTitle) => onTimerEvent('complete', taskTitle),
  } : undefined

  const activeTaskTitle = tasks[0]?.title ?? ''
  const isFull = maxTasks !== Infinity && tasks.length >= maxTasks
  const countDisplay = maxTasks === Infinity
    ? `${tasks.length}`
    : `${tasks.length}/${maxTasks}`

  return (
    <div
      ref={setNodeRef}
      className={`${styles.zone} ${styles[zone.toLowerCase()]} ${isOver ? styles.over : ''} ${isFull ? styles.full : ''}`}
      data-testid={`zone-${zone}`}
    >
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          {icon && <span className={styles.icon}>{icon}</span>}
          <h2 className={styles.title}>{title}</h2>
          {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
          {maxTasks !== Infinity && (
            <span className={styles.maxLabel}>max {maxTasks}</span>
          )}
          {zone === 'HOLDING' && onSuggestPriority && (
            <button
              className={styles.prioritySuggestBtn}
              onClick={onSuggestPriority}
              title="Echoに優先順位を提案してもらう"
            >
              ◈ Echo
            </button>
          )}
        </div>
        <span className={styles.count}>{countDisplay}</span>
      </div>
      
      {/* ACTIVEゾーンかつタスクが存在する場合にタイマーを表示 */}
      {zone === 'ACTIVE' && tasks.length > 0 && (
        <Timer
          initialMinutes={tasks[0].estimatedTime || defaultTimer}
          taskTitle={activeTaskTitle}
          callbacks={timerCallbacks}
        />
      )}

      <SortableContext
        items={tasks.map(t => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className={styles.taskList}>
          {tasks.length === 0 ? (
            <div className={styles.empty}>
              ここにタスクをドラッグして追加
            </div>
          ) : (
            tasks.map(task => (
              <SortableFlightStrip
                key={task.id}
                task={task}
                onComplete={onComplete}
                onUndo={onUndo}
                onClick={onClickTask}
                isBlocked={blockedTaskIds?.has(task.id)}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  )
}
