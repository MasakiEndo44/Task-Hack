import { useState, useEffect, useRef } from 'react'
import type { AppTag } from '../../types/tag'
import { MAX_TAG_NAME_LENGTH, MAX_TAGS, MAX_TAGS_PER_TASK, TAG_COLORS } from '../../types/tag'
import { getTagSuggestions } from '../../utils/tagUtils'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Task, RecurrenceFrequency } from '../../types/task'
import styles from './TaskDetail.module.css'

interface SubtaskItemProps {
  id: string
  title: string
  completed: boolean
  onToggle: () => void
  onEdit: (v: string) => void
  onBlur: () => void
  onDelete: () => void
}

function SortableSubtaskItem({ id, title, completed, onToggle, onEdit, onBlur, onDelete }: SubtaskItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  return (
    <div ref={setNodeRef} style={style} className={styles.subtaskItem}>
      <button className={styles.dragHandle} {...attributes} {...listeners} title="ドラッグして並び替え">⠿</button>
      <input
        type="checkbox"
        checked={completed}
        onChange={onToggle}
        className={styles.subtaskCheckbox}
      />
      <input
        type="text"
        value={title}
        onChange={(e) => onEdit(e.target.value)}
        onBlur={onBlur}
        className={`${styles.subtaskInput} ${completed ? styles.completedSubtask : ''}`}
      />
      <button onClick={onDelete} className={styles.deleteSubtaskBtn} title="削除">✕</button>
    </div>
  )
}

interface TaskDetailProps {
  task: Task
  allTasks?: Task[]
  tags?: AppTag[]
  onUpdate: (taskId: string, updates: Partial<Task>) => void
  onDelete?: (taskId: string) => void
  onTagsChange?: (tags: AppTag[]) => void
  onStartClarification?: (task: Task) => void
}

export function TaskDetail({ task, allTasks = [], tags = [], onUpdate, onDelete, onTagsChange, onStartClarification }: TaskDetailProps) {
  const [estimatedTime, setEstimatedTime] = useState(task.estimatedTime || 25)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(!task.title)
  const [titleDraft, setTitleDraft] = useState(task.title)
  const [notes, setNotes] = useState(task.notes || '')
  const [scheduledStartDate, setScheduledStartDate] = useState(task.scheduledStart ? task.scheduledStart.split('T')[0] : '')
  const [subtasks, setSubtasks] = useState(task.subtasks || [])
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [isSubtaskComposing, setIsSubtaskComposing] = useState(false)
  const [recurrenceFreq, setRecurrenceFreq] = useState<RecurrenceFrequency | ''>(task.recurrence?.frequency ?? '')
  const [recurrenceDayOfWeek, setRecurrenceDayOfWeek] = useState(task.recurrence?.dayOfWeek ?? 1)
  const [recurrenceDayOfMonth, setRecurrenceDayOfMonth] = useState(task.recurrence?.dayOfMonth ?? 1)

  // taskが切り替わったら初期値をリセット
  useEffect(() => {
    setShowDeleteConfirm(false)
    setIsEditingTitle(!task.title)
    setTitleDraft(task.title)
    setEstimatedTime(task.estimatedTime || 25)
    setNotes(task.notes || '')
    setScheduledStartDate(task.scheduledStart ? task.scheduledStart.split('T')[0] : '')
    setSubtasks(task.subtasks || [])
    setNewSubtaskTitle('')
    setRecurrenceFreq(task.recurrence?.frequency ?? '')
    setRecurrenceDayOfWeek(task.recurrence?.dayOfWeek ?? 1)
    setRecurrenceDayOfMonth(task.recurrence?.dayOfMonth ?? 1)
  }, [task.id, task.estimatedTime, task.notes, task.scheduledStart, task.subtasks, task.recurrence])

  const handleTitleCommit = () => {
    const trimmed = titleDraft.trim()
    if (trimmed && trimmed !== task.title) {
      onUpdate(task.id, { title: trimmed })
    } else {
      setTitleDraft(task.title)
    }
    setIsEditingTitle(false)
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleTitleCommit()
    if (e.key === 'Escape') { setTitleDraft(task.title); setIsEditingTitle(false) }
  }

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
  
  // タグ関連
  const [tagInput, setTagInput] = useState('')
  const [showTagInput, setShowTagInput] = useState(false)
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0])
  const tagInputRef = useRef<HTMLInputElement>(null)

  const assignedTagIds = task.tagIds ?? []
  const assignedTags = assignedTagIds.map(id => tags.find(t => t.id === id)).filter(Boolean) as AppTag[]
  const suggestions = getTagSuggestions(task, tags, allTasks)

  const handleAddTag = (tagId: string) => {
    if (assignedTagIds.includes(tagId) || assignedTagIds.length >= MAX_TAGS_PER_TASK) return
    onUpdate(task.id, { tagIds: [...assignedTagIds, tagId] })
  }

  const handleRemoveTag = (tagId: string) => {
    onUpdate(task.id, { tagIds: assignedTagIds.filter(id => id !== tagId) })
  }

  const handleCreateTag = () => {
    const name = tagInput.trim().slice(0, MAX_TAG_NAME_LENGTH)
    if (!name || !onTagsChange) return
    if (tags.find(t => t.name.toLowerCase() === name.toLowerCase())) {
      const existing = tags.find(t => t.name.toLowerCase() === name.toLowerCase())!
      handleAddTag(existing.id)
      setTagInput('')
      setShowTagInput(false)
      return
    }
    if (tags.length >= MAX_TAGS) return
    const newTag: AppTag = {
      id: 'tag-' + Math.random().toString(36).slice(2, 10),
      name,
      color: selectedColor,
      createdAt: new Date().toISOString(),
    }
    const newTags = [...tags, newTag]
    onTagsChange(newTags)
    onUpdate(task.id, { tagIds: [...assignedTagIds, newTag.id] })
    setTagInput('')
    setShowTagInput(false)
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = subtasks.findIndex(st => st.id === active.id)
    const newIndex = subtasks.findIndex(st => st.id === over.id)
    const reordered = arrayMove(subtasks, oldIndex, newIndex)
    setSubtasks(reordered)
    onUpdate(task.id, { subtasks: reordered })
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
        {isEditingTitle ? (
          <input
            className={styles.titleInput}
            value={titleDraft}
            onChange={e => setTitleDraft(e.target.value)}
            onBlur={handleTitleCommit}
            onKeyDown={handleTitleKeyDown}
            autoFocus
          />
        ) : (
          <h3
            className={styles.title}
            onClick={() => setIsEditingTitle(true)}
            title="クリックして名前を変更"
          >
            {task.title}
            <span className={styles.editHint}>✎</span>
          </h3>
        )}
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
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={subtasks.map(st => st.id)} strategy={verticalListSortingStrategy}>
            <div className={styles.subtasksList}>
              {subtasks.map((st) => (
                <SortableSubtaskItem
                  key={st.id}
                  id={st.id}
                  title={st.title}
                  completed={st.completed}
                  onToggle={() => handleToggleSubtask(st.id)}
                  onEdit={(v) => handleEditSubtask(st.id, v)}
                  onBlur={() => onUpdate(task.id, { subtasks })}
                  onDelete={() => handleDeleteSubtask(st.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        {subtasks.length < 3 && (
          <div className={styles.addSubtaskContainer}>
            <input
              type="text"
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isSubtaskComposing && !(e.nativeEvent as any).isComposing) {
                  handleAddSubtask()
                }
              }}
              onCompositionStart={() => setIsSubtaskComposing(true)}
              onCompositionEnd={() => setIsSubtaskComposing(false)}
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
      {/* タグセクション */}
      <div className={styles.section}>
        <label className={styles.label}>🏷️ タグ</label>
        <div className={styles.tagList}>
          {assignedTags.map(tag => (
            <span key={tag.id} className={styles.tagChip} style={{ background: tag.color + '33', borderColor: tag.color, color: tag.color }}>
              {tag.name}
              <button className={styles.tagRemoveBtn} onClick={() => handleRemoveTag(tag.id)} aria-label={`${tag.name}を削除`}>×</button>
            </span>
          ))}
          {assignedTagIds.length < MAX_TAGS_PER_TASK && (
            <button className={styles.tagAddBtn} onClick={() => { setShowTagInput(v => !v); setTimeout(() => tagInputRef.current?.focus(), 50) }}>
              + タグ
            </button>
          )}
        </div>

        {showTagInput && (
          <div className={styles.tagInputArea}>
            <div className={styles.tagColorRow}>
              {TAG_COLORS.map(c => (
                <button
                  key={c}
                  className={`${styles.colorDot} ${selectedColor === c ? styles.colorDotActive : ''}`}
                  style={{ background: c }}
                  onClick={() => setSelectedColor(c)}
                  aria-label={c}
                />
              ))}
            </div>
            <div className={styles.tagInputRow}>
              <input
                ref={tagInputRef}
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value.slice(0, MAX_TAG_NAME_LENGTH))}
                onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleCreateTag() }}
                placeholder="タグ名（最大10文字）"
                className={styles.tagInput}
                maxLength={MAX_TAG_NAME_LENGTH}
              />
              <button className={styles.tagCreateBtn} onClick={handleCreateTag} disabled={!tagInput.trim()}>作成</button>
            </div>
            {tags.filter(t => !assignedTagIds.includes(t.id)).length > 0 && (
              <div className={styles.tagExistingList}>
                {tags.filter(t => !assignedTagIds.includes(t.id)).map(tag => (
                  <button
                    key={tag.id}
                    className={styles.tagExistingChip}
                    style={{ borderColor: tag.color, color: tag.color }}
                    onClick={() => { handleAddTag(tag.id); setShowTagInput(false) }}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Echo Auto-Fill 候補（常時表示、無視可） */}
        {suggestions.length > 0 && (
          <div className={styles.tagSuggestions}>
            <span className={styles.tagSuggestionLabel}>◈ Echo 候補:</span>
            {suggestions.map(tag => (
              <button
                key={tag.id}
                className={styles.tagSuggestionChip}
                style={{ borderColor: tag.color, color: tag.color }}
                onClick={() => handleAddTag(tag.id)}
              >
                {tag.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {allTasks.length > 1 && (
        <div className={styles.section}>
          <label className={styles.label}>🔗 前提タスク（このタスクの前に完了が必要）</label>
          <select
            className={styles.select}
            value={task.dependsOn ?? ''}
            onChange={e => onUpdate(task.id, { dependsOn: e.target.value || undefined })}
          >
            <option value="">なし</option>
            {allTasks
              .filter(t => t.id !== task.id && t.zone !== 'CLEARED')
              .map(t => (
                <option key={t.id} value={t.id}>
                  {t.id} — {t.title}
                </option>
              ))}
          </select>
          {task.dependsOn && (() => {
            const dep = allTasks.find(t => t.id === task.dependsOn)
            return dep && dep.zone !== 'CLEARED'
              ? <span className={styles.depBlocked}>⚠ 「{dep.title}」が完了するまでACTIVEに移動できません</span>
              : null
          })()}
        </div>
      )}

      {onStartClarification && task.zone !== 'CLEARED' && (
        <div className={styles.section}>
          <button
            className={styles.clarificationBtn}
            onClick={() => onStartClarification(task)}
          >
            ◈ Echoに詳細を聞いてもらう
          </button>
        </div>
      )}

      {onDelete && (
        <div className={styles.section}>
          {!showDeleteConfirm ? (
            <button
              className={styles.deleteButton}
              onClick={() => setShowDeleteConfirm(true)}
            >
              このタスクを削除
            </button>
          ) : (
            <div className={styles.deleteConfirm}>
              <p className={styles.deleteWarning}>
                このタスクを削除しますか？削除すると元に戻せません。
              </p>
              <div className={styles.deleteActions}>
                <button
                  className={styles.deleteConfirmButton}
                  onClick={() => onDelete(task.id)}
                >
                  削除する
                </button>
                <button
                  className={styles.deleteCancelButton}
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
