// Corporate SSL inspection bypass: allows TLS connections to api.openai.com
// through proxies that present self-signed certificates.
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0'

import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import fs from 'fs/promises'
import { is } from '@electron-toolkit/utils'
import OpenAI from 'openai'
import { DEFAULT_SETTINGS } from './types/settings'
import { runSweep } from './services/sweepService'
import { validateVaultPath, syncContextToVault } from './services/vaultService'
import { loadUserContext, injectContext, initUserContextIfNeeded } from './services/contextService'
import { loadSoul, initEcho, updateSoulStyle } from './services/soulService'
import { startScheduler, stopScheduler, checkAndRunCatchup, checkAndRunRecurringTasks } from './services/scheduler'
import { processRecurringTasks } from './services/recurrenceService'
import { suggestPriority } from './services/priorityService'

function classifyOpenAIError(e: any): string {
  const msg: string = e?.message ?? String(e)
  if (e?.status === 401 || msg.includes('401') || msg.toLowerCase().includes('auth')) {
    return 'APIキーが無効です。設定画面でAPIキーを確認してください。'
  }
  if (e?.status === 429 || msg.includes('429') || msg.toLowerCase().includes('rate limit')) {
    return 'APIのレート制限に達しました。しばらく待ってから再試行してください。'
  }
  if (msg.toLowerCase().includes('connection') || msg.toLowerCase().includes('enotfound') || msg.toLowerCase().includes('econnrefused')) {
    return 'OpenAI APIに接続できませんでした。インターネット接続とファイアウォール設定を確認してください。'
  }
  return `AI接続エラー: ${msg}`
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 1000,
    minWidth: 1024,
    minHeight: 800,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0a0e17',
    title: 'Task-Hack',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer based on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

async function loadCurrentSettings() {
  const settingsFile = join(app.getPath('home'), '.task-hack', 'settings.json')
  try {
    const data = await fs.readFile(settingsFile, 'utf-8')
    return { ...DEFAULT_SETTINGS, ...JSON.parse(data) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

app.whenReady().then(async () => {
  createWindow()

  const dataDir = join(app.getPath('home'), '.task-hack')
  const tasksFile = join(dataDir, 'tasks.json')
  const settingsFile = join(dataDir, 'settings.json')

  ipcMain.handle('loadTasks', async () => {
    try {
      await fs.mkdir(dataDir, { recursive: true })
      const data = await fs.readFile(tasksFile, 'utf-8')
      return JSON.parse(data)
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        return null // File doesn't exist yet, which is fine
      }
      console.error('Failed to load tasks:', err)
      throw err
    }
  })

  ipcMain.handle('saveTasks', async (_, tasks) => {
    try {
      await fs.mkdir(dataDir, { recursive: true })
      await fs.writeFile(tasksFile, JSON.stringify(tasks, null, 2), 'utf-8')
    } catch (err) {
      console.error('Failed to save tasks:', err)
      throw err
    }
  })

  ipcMain.handle('loadSettings', async () => {
    try {
      await fs.mkdir(dataDir, { recursive: true })
      const data = await fs.readFile(settingsFile, 'utf-8')
      return JSON.parse(data)
    } catch (err: any) {
      return { openAiApiKey: '' }
    }
  })

  ipcMain.handle('saveSettings', async (_, settings) => {
    try {
      await fs.mkdir(dataDir, { recursive: true })
      await fs.writeFile(settingsFile, JSON.stringify(settings, null, 2), 'utf-8')
    } catch (err) {
      console.error('Failed to save settings:', err)
      throw err
    }
  })

  ipcMain.handle('startChatStream', async (event, messages, systemPrompt, apiKey) => {
    if (!apiKey) throw new Error('API Key missing')
    const openai = new OpenAI({ apiKey })
    try {
      const stream = openai.chat.completions.stream({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ]
      })
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || ''
        if (text) event.sender.send('chat-chunk', text)
      }
      event.sender.send('chat-done')
    } catch (e: any) {
      const msg = classifyOpenAIError(e)
      event.sender.send('chat-error', msg)
    }
  })

  ipcMain.handle('testChatConnection', async (_, apiKey: string) => {
    if (!apiKey) return { ok: false, error: 'APIキーが設定されていません' }
    const openai = new OpenAI({ apiKey })
    try {
      await openai.models.list()
      return { ok: true }
    } catch (e: any) {
      return { ok: false, error: classifyOpenAIError(e) }
    }
  })

  // Phase 4: Sweep
  ipcMain.handle('sweep:run', async () => {
    const settings = await loadCurrentSettings()
    await runSweep(settings)
  })

  // Phase 4: Vault
  ipcMain.handle('vault:validate', async (_, vaultPath: string) => {
    return validateVaultPath(vaultPath)
  })

  ipcMain.handle('vault:selectFolder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Obsidian Vaultフォルダを選択してください'
    })
    return result.canceled ? null : result.filePaths[0]
  })

  // Phase 4: Context (FB-004: user-context.md 統合管理)
  ipcMain.handle('context:load', async () => {
    return loadUserContext()
  })

  ipcMain.handle('context:inject', async (_, input: string) => {
    const s = await loadCurrentSettings()
    if (!s.openAiApiKey) throw new Error('APIキーが設定されていません')
    const result = await injectContext(s.openAiApiKey, input)
    // 注入成功後、Vault同期（即時反映）
    if (s.obsidianVaultPath) {
      const ctx = await loadUserContext()
      if (ctx) await syncContextToVault(s.obsidianVaultPath, ctx)
    }
    return result
  })

  // Phase 4: Echo / Soul
  ipcMain.handle('echo:init', async (_, userName: string) => {
    await initUserContextIfNeeded(userName)
    return initEcho(userName)
  })
  ipcMain.handle('soul:load', async () => {
    return loadSoul()
  })
  ipcMain.handle('soul:updateStyle', async (_, content: string) => {
    return updateSoulStyle(content)
  })

  // C-2: ユーザーコンテキスト
  ipcMain.handle('context:load', async () => {
    return loadUserContext()
  })
  ipcMain.handle('context:save', async (_, content: string) => {
    return saveUserContext(content)
  })
  ipcMain.handle('context:importFile', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      title: 'コンテキストファイルを選択してください',
      filters: [{ name: 'テキストファイル', extensions: ['md', 'txt'] }]
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return fs.readFile(result.filePaths[0], 'utf-8')
  })

  // Phase 5: 繰り返しタスクチェック
  ipcMain.handle('recurrence:check', async (_, tasks) => {
    return processRecurringTasks(tasks)
  })

  // Phase 5: 優先度提案
  ipcMain.handle('priority:suggest', async (_, tasks) => {
    const s = await loadCurrentSettings()
    return suggestPriority(s.openAiApiKey ?? '', tasks)
  })

  // C-1: タグ管理
  const tagsFile = join(dataDir, 'tags.json')
  ipcMain.handle('tags:load', async () => {
    try {
      const data = await fs.readFile(tagsFile, 'utf-8')
      return JSON.parse(data)
    } catch {
      return []
    }
  })
  ipcMain.handle('tags:save', async (_, tags) => {
    await fs.mkdir(dataDir, { recursive: true })
    await fs.writeFile(tagsFile, JSON.stringify(tags, null, 2), 'utf-8')
  })

  // Phase B: 週次レポートオーバーレイ
  ipcMain.handle('sweep:getPendingReport', async () => {
    const reportFile = join(dataDir, 'pending-sweep-report.json')
    try {
      const data = await fs.readFile(reportFile, 'utf-8')
      await fs.unlink(reportFile).catch(() => {})
      return JSON.parse(data)
    } catch {
      return null
    }
  })

  // C-3: レポート履歴リスト
  ipcMain.handle('reports:list', async () => {
    const archiveDir = join(dataDir, 'archive')
    try {
      await fs.mkdir(archiveDir, { recursive: true })
      const files = await fs.readdir(archiveDir)
      const jsonFiles = files.filter(f => /^\d{4}-W\d{2}\.json$/.test(f)).sort().reverse().slice(0, 12)
      const reports = await Promise.all(jsonFiles.map(async (file) => {
        const weekLabel = file.replace('.json', '')
        try {
          const data = await fs.readFile(join(archiveDir, file), 'utf-8')
          const tasks = JSON.parse(data) as Array<{ title: string }>
          return {
            weekLabel,
            taskCount: tasks.length,
            titles: tasks.slice(0, 3).map(t => t.title)
          }
        } catch {
          return { weekLabel, taskCount: 0, titles: [] }
        }
      }))
      return reports
    } catch {
      return []
    }
  })

  // Phase 4: スケジューラー起動
  const settings = await loadCurrentSettings()
  startScheduler(settings, loadCurrentSettings)
  await checkAndRunCatchup(settings, loadCurrentSettings)

  // Phase 5: 起動時繰り返しタスクチェック
  await checkAndRunRecurringTasks()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  stopScheduler()
})
