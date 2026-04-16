import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Task, ZoneType } from '../../types/task'
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
}

function SortableFlightStrip({
  task,
  onComplete,
  onUndo,
  onClick
}: {
  task: Task
  onComplete: (taskId: string) => void
  onUndo?: (taskId: string) => void
  onClick?: (taskId: string) => void
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
      <FlightStrip task={task} onComplete={onComplete} onUndo={onUndo} isDragging={isDragging} />
    </div>
  )
}

export function Zone({ zone, title, subtitle, icon, tasks, maxTasks, onComplete, onUndo, onClickTask, defaultTimer = 25 }: ZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id: zone })
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
        </div>
        <span className={styles.count}>{countDisplay}</span>
      </div>
      
      {/* ACTIVEゾーンかつタスクが存在する場合にタイマーを表示 */}
      {zone === 'ACTIVE' && tasks.length > 0 && (
        <Timer initialMinutes={tasks[0].estimatedTime || defaultTimer} />
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
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  )
}
