import cron from 'node-cron'
import fs from 'fs/promises'
import { join } from 'path'
import { app } from 'electron'
import type { AppSettings } from '../types/settings'
import { runSweep } from './sweepService'
import { processRecurringTasks } from './recurrenceService'
import type { Task } from '../../renderer/types/task'

let scheduledTask: cron.ScheduledTask | null = null

export function startScheduler(
  settings: AppSettings,
  onSettingsRefresh: () => Promise<AppSettings>
): void {
  if (scheduledTask) {
    scheduledTask.stop()
    scheduledTask = null
  }

  const schedule = settings.sweepSchedule ?? '0 22 * * 0'

  if (!cron.validate(schedule)) {
    console.error(`[Scheduler] 無効なcron書式: ${schedule}`)
    return
  }

  scheduledTask = cron.schedule(schedule, async () => {
    console.log('[Scheduler] 週次スイープを開始します:', new Date().toISOString())
    const latestSettings = await onSettingsRefresh()
    await runSweep(latestSettings)
  })

  console.log(`[Scheduler] スケジュール設定完了: ${schedule}`)
}

export function stopScheduler(): void {
  if (scheduledTask) {
    scheduledTask.stop()
    scheduledTask = null
    console.log('[Scheduler] スケジューラー停止')
  }
}

export async function checkAndRunRecurringTasks(): Promise<void> {
  const dataDir = join(app.getPath('home'), '.task-hack')
  const tasksFile = join(dataDir, 'tasks.json')

  let tasks: Task[] = []
  try {
    const data = await fs.readFile(tasksFile, 'utf-8')
    tasks = JSON.parse(data)
  } catch {
    return
  }

  const { generated, updatedTemplates } = processRecurringTasks(tasks)
  if (generated.length === 0) return

  const updatedTasks = tasks
    .map(t => updatedTemplates.find(u => u.id === t.id) ?? t)
    .concat(generated)

  await fs.writeFile(tasksFile, JSON.stringify(updatedTasks, null, 2), 'utf-8')
  console.log(`[Recurrence] ${generated.length}件の定期タスクを生成しました`)
}

export async function checkAndRunCatchup(
  settings: AppSettings,
  onSettingsRefresh: () => Promise<AppSettings>
): Promise<void> {
  if (!settings.lastSweepAt) return

  const lastSweep = new Date(settings.lastSweepAt)
  const now = new Date()
  const daysSinceLast = (now.getTime() - lastSweep.getTime()) / (1000 * 60 * 60 * 24)

  if (daysSinceLast >= 7) {
    console.log(`[Scheduler] キャッチアップスイープ: 前回から${Math.floor(daysSinceLast)}日経過`)
    setTimeout(async () => {
      const latestSettings = await onSettingsRefresh()
      await runSweep(latestSettings)
    }, 30_000)
  }
}
