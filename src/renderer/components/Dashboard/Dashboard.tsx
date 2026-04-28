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
import type { AppTag } from '../../types/tag'
import { ZONE_LIMITS } from '../../types/task'
import { Zone } from '../Zone/Zone'
import { FlightStrip } from '../FlightStrip/FlightStrip'
import styles from './Dashboard.module.css'

interface DashboardProps {
  tasksByZone: Record<ZoneType, Task[]>
  allTasks: Task[]
  onComplete: (taskId: string) => void
  onUndoComplete: (taskId: string) => void
  onMoveTask: (taskId: string, toZone: ZoneType, toIndex: number) => void
  onClickTask?: (taskId: string) => void
  defaultTimer: number
  onTimerEvent?: (event: 'start' | 'wrapup' | 'complete', taskTitle: string, remainingMin?: number) => void
  onSuggestPriority?: () => void
  onAddEmptyTask?: (zone: ZoneType) => void
  tags?: AppTag[]
}

export function Dashboard({ tasksByZone, allTasks = [], onComplete, onUndoComplete, onMoveTask, onClickTask, defaultTimer, onTimerEvent, onSuggestPriority, onAddEmptyTask, tags = [] }: DashboardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null)

  const filteredOutTaskIds = activeTagFilter
    ? new Set(allTasks.filter(t => !(t.tagIds ?? []).includes(activeTagFilter)).map(t => t.id))
    : undefined

  const blockedTaskIds = new Set(
    allTasks
      .filter(t => {
        if (!t.dependsOn) return false
        const dep = allTasks.find(d => d.id === t.dependsOn)
        return dep && dep.zone !== 'CLEARED'
      })
      .map(t => t.id)
  )

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

    if (['ACTIVE', 'NEXT_ACTION', 'HOLDING', 'CLEARED'].includes(over.id as string)) {
      toZone = over.id as ZoneType
      toIndex = tasksByZone[toZone].length
    } else {
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
      {tags.length > 0 && (
        <div className={styles.tagFilterBar}>
          <button
            className={`${styles.tagFilterBtn} ${!activeTagFilter ? styles.tagFilterBtnActive : ''}`}
            onClick={() => setActiveTagFilter(null)}
          >
            すべて
          </button>
          {tags.map(tag => (
            <button
              key={tag.id}
              className={`${styles.tagFilterBtn} ${activeTagFilter === tag.id ? styles.tagFilterBtnActive : ''}`}
              style={activeTagFilter === tag.id ? { background: tag.color + '33', borderColor: tag.color, color: tag.color } : { borderColor: tag.color + '88', color: tag.color }}
              onClick={() => setActiveTagFilter(prev => prev === tag.id ? null : tag.id)}
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}
      <div className={styles.dashboard}>
        {/* 左列: ACTIVE + NEXT ACTION（縦積み） */}
        <div className={styles.leftColumn}>
          <div className={styles.activeZone}>
            <Zone
              zone="ACTIVE"
              title="ACTIVE"
              subtitle="進行中"
              icon="▶"
              tasks={tasksByZone.ACTIVE}
              maxTasks={ZONE_LIMITS.ACTIVE}
              onComplete={onComplete}
              onClickTask={onClickTask}
              defaultTimer={defaultTimer}
              onTimerEvent={onTimerEvent}
              onAddEmptyTask={onAddEmptyTask ? () => onAddEmptyTask('ACTIVE') : undefined}
              blockedTaskIds={blockedTaskIds}
              filteredOutTaskIds={filteredOutTaskIds}
            />
          </div>
          <div className={styles.nextZone}>
            <Zone
              zone="NEXT_ACTION"
              title="NEXT ACTION"
              subtitle="次のアクション"
              icon="→"
              tasks={tasksByZone.NEXT_ACTION}
              maxTasks={ZONE_LIMITS.NEXT_ACTION}
              onComplete={onComplete}
              onClickTask={onClickTask}
              onAddEmptyTask={onAddEmptyTask ? () => onAddEmptyTask('NEXT_ACTION') : undefined}
              blockedTaskIds={blockedTaskIds}
              filteredOutTaskIds={filteredOutTaskIds}
            />
          </div>
        </div>

        {/* 中央列: HOLDING */}
        <div className={styles.holdingZone}>
          <Zone
            zone="HOLDING"
            title="HOLDING"
            subtitle="待機中"
            icon="‖"
            tasks={tasksByZone.HOLDING}
            maxTasks={ZONE_LIMITS.HOLDING}
            onComplete={onComplete}
            onClickTask={onClickTask}
            onSuggestPriority={onSuggestPriority}
            onAddEmptyTask={onAddEmptyTask ? () => onAddEmptyTask('HOLDING') : undefined}
            blockedTaskIds={blockedTaskIds}
            filteredOutTaskIds={filteredOutTaskIds}
          />
        </div>

        {/* 右列: CLEARED */}
        <div className={styles.clearedZone}>
          <Zone
            zone="CLEARED"
            title="CLEARED"
            subtitle="完了"
            icon="✓"
            tasks={tasksByZone.CLEARED}
            maxTasks={ZONE_LIMITS.CLEARED}
            onComplete={onComplete}
            onUndo={onUndoComplete}
            onClickTask={onClickTask}
            blockedTaskIds={blockedTaskIds}
            filteredOutTaskIds={filteredOutTaskIds}
          />
        </div>
      </div>

      <DragOverlay>
        {activeTask ? (
          <FlightStrip task={activeTask} onComplete={() => {}} onClick={onClickTask} isDragging />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
