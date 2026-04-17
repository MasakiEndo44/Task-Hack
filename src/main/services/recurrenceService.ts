import type { Task, RecurrenceRule } from '../../renderer/types/task'
import { generateFlightId } from '../../renderer/utils/flightId'

export function shouldGenerateToday(rule: RecurrenceRule, now: Date = new Date()): boolean {
  const lastGen = rule.lastGeneratedAt ? new Date(rule.lastGeneratedAt) : null

  if (lastGen && isSameDay(lastGen, now)) return false

  switch (rule.frequency) {
    case 'daily':
      if (!lastGen) return true
      return now.getTime() - lastGen.getTime() >= 24 * 60 * 60 * 1000
    case 'weekly': {
      const targetDay = rule.dayOfWeek ?? 1
      if (now.getDay() !== targetDay) return false
      if (!lastGen) return true
      return now.getTime() - lastGen.getTime() >= 6 * 24 * 60 * 60 * 1000
    }
    case 'monthly': {
      const targetDate = rule.dayOfMonth ?? 1
      if (now.getDate() !== targetDate) return false
      if (!lastGen) return true
      return now.getMonth() !== lastGen.getMonth() || now.getFullYear() !== lastGen.getFullYear()
    }
  }
}

export function generateNextInstance(template: Task, now: Date = new Date()): Task {
  const { recurrence: _recurrence, id: _templateId, ...rest } = template
  return {
    ...rest,
    id: generateFlightId(),
    zone: 'NEXT_ACTION',
    order: 0,
    createdAt: now.toISOString(),
    completedAt: undefined,
  }
}

export function updateLastGeneratedAt(template: Task, now: Date = new Date()): Task {
  if (!template.recurrence) return template
  return {
    ...template,
    recurrence: {
      ...template.recurrence,
      lastGeneratedAt: now.toISOString(),
    }
  }
}

export function processRecurringTasks(
  tasks: Task[],
  now: Date = new Date()
): { generated: Task[]; updatedTemplates: Task[] } {
  const generated: Task[] = []
  const updatedTemplates: Task[] = []

  for (const task of tasks) {
    if (!task.recurrence) continue
    if (task.zone === 'CLEARED') continue

    if (shouldGenerateToday(task.recurrence, now)) {
      generated.push(generateNextInstance(task, now))
      updatedTemplates.push(updateLastGeneratedAt(task, now))
    }
  }

  return { generated, updatedTemplates }
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}
