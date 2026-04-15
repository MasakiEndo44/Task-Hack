import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Task, ZoneType } from '../../types/task'
import { FlightStrip } from '../FlightStrip/FlightStrip'
import styles from './Zone.module.css'

interface ZoneProps {
  zone: ZoneType
  title: string
  tasks: Task[]
  maxTasks: number
  onComplete: (taskId: string) => void
}

function SortableFlightStrip({
  task,
  onComplete
}: {
  task: Task
  onComplete: (taskId: string) => void
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
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <FlightStrip task={task} onComplete={onComplete} isDragging={isDragging} />
    </div>
  )
}

export function Zone({ zone, title, tasks, maxTasks, onComplete }: ZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id: zone })
  const isFull = maxTasks !== Infinity && tasks.length >= maxTasks
  const countDisplay = maxTasks === Infinity
    ? `${tasks.length}`
    : `${tasks.length} / ${maxTasks}`

  return (
    <div
      ref={setNodeRef}
      className={`${styles.zone} ${styles[zone.toLowerCase()]} ${isOver ? styles.over : ''} ${isFull ? styles.full : ''}`}
      data-testid={`zone-${zone}`}
    >
      <div className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        <span className={styles.count}>{countDisplay}</span>
      </div>
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
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  )
}
