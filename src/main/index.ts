import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import fs from 'fs/promises'
import { is } from '@electron-toolkit/utils'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
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

app.whenReady().then(() => {
  createWindow()

  const dataDir = join(app.getPath('home'), '.task-hack')
  const tasksFile = join(dataDir, 'tasks.json')

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

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
