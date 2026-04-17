import cron from 'node-cron'
import type { AppSettings } from '../types/settings'
import { runSweep } from './sweepService'

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
