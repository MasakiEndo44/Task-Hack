import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter
} from '@dnd-kit/core'
import { useState } from 'react'
import type { Task, ZoneType } from '../../types/task'
import { ZONE_LIMITS } from '../../types/task'
import { Zone } from '../Zone/Zone'
import { FlightStrip } from '../FlightStrip/FlightStrip'
import styles from './Dashboard.module.css'

interface DashboardProps {
  tasksByZone: Record<ZoneType, Task[]>
  onComplete: (taskId: string) => void
  onMoveTask: (taskId: string, toZone: ZoneType, toIndex: number) => void
}

export function Dashboard({ tasksByZone, onComplete, onMoveTask }: DashboardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 }
    })
  )

  function handleDragStart(event: DragStartEvent) {
    const { active } = event
    const allTasks = Object.values(tasksByZone).flat()
    const task = allTasks.find(t => t.id === active.id)
    if (task) setActiveTask(task)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const taskId = active.id as string
    let toZone: ZoneType
    let toIndex = 0

    // overがゾーンIDの場合
    if (['ACTIVE', 'NEXT_ACTION', 'HOLDING', 'CLEARED'].includes(over.id as string)) {
      toZone = over.id as ZoneType
      toIndex = tasksByZone[toZone].length
    } else {
      // overが他のタスクIDの場合 — そのタスクのゾーンに移動
      const allTasks = Object.values(tasksByZone).flat()
      const overTask = allTasks.find(t => t.id === over.id)
      if (!overTask) return
      toZone = overTask.zone
      toIndex = tasksByZone[toZone].findIndex(t => t.id === over.id)
    }

    onMoveTask(taskId, toZone, toIndex)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={styles.dashboard}>
        {/* 上段: ACTIVE（左・大きく） + NEXT ACTION（右） */}
        <div className={styles.topRow}>
          <div className={styles.activeZone}>
            <Zone
              zone="ACTIVE"
              title="ACTIVE"
              tasks={tasksByZone.ACTIVE}
              maxTasks={ZONE_LIMITS.ACTIVE}
              onComplete={onComplete}
            />
          </div>
          <div className={styles.nextZone}>
            <Zone
              zone="NEXT_ACTION"
              title="NEXT ACTION"
              tasks={tasksByZone.NEXT_ACTION}
              maxTasks={ZONE_LIMITS.NEXT_ACTION}
              onComplete={onComplete}
            />
          </div>
        </div>

        {/* 下段: HOLDING（左） + CLEARED（右） */}
        <div className={styles.bottomRow}>
          <div className={styles.holdingZone}>
            <Zone
              zone="HOLDING"
              title="HOLDING"
              tasks={tasksByZone.HOLDING}
              maxTasks={ZONE_LIMITS.HOLDING}
              onComplete={onComplete}
            />
          </div>
          <div className={styles.clearedZone}>
            <Zone
              zone="CLEARED"
              title="CLEARED"
              tasks={tasksByZone.CLEARED}
              maxTasks={ZONE_LIMITS.CLEARED}
              onComplete={onComplete}
            />
          </div>
        </div>
      </div>

      {/* ドラッグ時のオーバーレイ */}
      <DragOverlay>
        {activeTask ? (
          <FlightStrip task={activeTask} onComplete={() => {}} isDragging />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
