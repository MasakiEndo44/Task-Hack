import fs from 'fs/promises'
import { join } from 'path'
import { app, BrowserWindow } from 'electron'
import type { Task } from '../../renderer/types/task'
import type { SweepStatus } from '../../renderer/types/sweep'
import type { AppSettings } from '../types/settings'
import { generateWeeklyReport } from './reportService'
import { writeWeeklyReport, writeArchiveMd, writeLocalArchive, getWeekLabel, syncSoulToVault, syncContextToVault } from './vaultService'
import { loadUserContext } from './contextService'
import { loadSoul } from './soulService'

function sendProgress(status: SweepStatus): void {
  const win = BrowserWindow.getAllWindows()[0]
  if (win && !win.isDestroyed()) {
    win.webContents.send('sweep:progress', status)
  }
}

export async function runSweep(settings: AppSettings): Promise<void> {
  const dataDir = join(app.getPath('home'), '.task-hack')
  const tasksFile = join(dataDir, 'tasks.json')
  const tasksBak = join(dataDir, 'tasks.json.bak')
  const settingsFile = join(dataDir, 'settings.json')

  sendProgress({ phase: 'preparing', message: '管制室起動中... 着陸済みフライトを確認します' })

  let allTasks: Task[] = []
  try {
    const data = await fs.readFile(tasksFile, 'utf-8')
    allTasks = JSON.parse(data)
  } catch {
    sendProgress({ phase: 'done', message: 'タスクデータがありません', taskCount: 0 })
    return
  }

  const clearedTasks = allTasks.filter(t => t.zone === 'CLEARED')
  if (clearedTasks.length === 0) {
    sendProgress({ phase: 'done', message: 'CLEAREDフライトがありません。スイープをスキップします', taskCount: 0 })
    return
  }

  const weekLabel = getWeekLabel()
  sendProgress({ phase: 'collecting', taskCount: clearedTasks.length, message: `${clearedTasks.length}件のフライトを収集中... バックアップを作成します` })

  await fs.copyFile(tasksFile, tasksBak)

  try {
    sendProgress({ phase: 'generating', message: 'Echoが週次レポートを生成中... しばらくお待ちください' })

    let reportResult = null
    if (settings.openAiApiKey) {
      reportResult = await generateWeeklyReport(settings.openAiApiKey, clearedTasks, weekLabel)
    }

    sendProgress({ phase: 'archiving', message: 'フライトログをVaultに格納中...' })

    if (settings.obsidianVaultPath && reportResult) {
      await writeWeeklyReport(settings.obsidianVaultPath, weekLabel, reportResult.reportMd)
      await writeArchiveMd(settings.obsidianVaultPath, weekLabel, reportResult.archiveMd)
      
      const soulContent = await loadSoul()
      if (soulContent) await syncSoulToVault(settings.obsidianVaultPath, soulContent)
      
      const contextContent = await loadUserContext()
      if (contextContent) await syncContextToVault(settings.obsidianVaultPath, contextContent)
    } else {
      await writeLocalArchive(dataDir, weekLabel, clearedTasks)
    }

    sendProgress({ phase: 'cleaning', message: '格納庫を整理中... CLEAREDタスクを削除します' })

    const remainingTasks = allTasks.filter(t => t.zone !== 'CLEARED')
    await fs.writeFile(tasksFile, JSON.stringify(remainingTasks, null, 2), 'utf-8')
    await fs.unlink(tasksBak).catch(() => {})

    try {
      const settingsData = await fs.readFile(settingsFile, 'utf-8').then(JSON.parse).catch(() => ({}))
      await fs.writeFile(settingsFile, JSON.stringify({ ...settingsData, lastSweepAt: new Date().toISOString() }, null, 2), 'utf-8')
    } catch { /* settings更新失敗は致命的ではない */ }

    const pendingReport = {
      weekLabel,
      taskCount: clearedTasks.length,
      reportMd: reportResult?.reportMd ?? '',
    }
    const pendingReportFile = join(dataDir, 'pending-sweep-report.json')
    await fs.writeFile(pendingReportFile, JSON.stringify(pendingReport, null, 2), 'utf-8').catch(() => {})

    sendProgress({
      phase: 'done',
      taskCount: clearedTasks.length,
      message: `${clearedTasks.length}件のフライトが無事着陸しました。お疲れさまでした 🛬`
    })

  } catch (err: any) {
    sendProgress({
      phase: 'error',
      message: 'スイープ処理でエラーが発生しました。タスクデータは保護されています',
      error: err.message
    })
  }
}
