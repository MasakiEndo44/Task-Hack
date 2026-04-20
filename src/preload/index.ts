import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { SweepStatus } from '../renderer/types/sweep'

// Custom APIs for renderer
const api = {
  loadTasks: () => ipcRenderer.invoke('loadTasks'),
  saveTasks: (tasks: any) => ipcRenderer.invoke('saveTasks', tasks),
  loadSettings: () => ipcRenderer.invoke('loadSettings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('saveSettings', settings),
  startChatStream: (messages: any, systemPrompt: string, apiKey: string) =>
    ipcRenderer.invoke('startChatStream', messages, systemPrompt, apiKey),
  onChatChunk: (cb: (text: string) => void) =>
    ipcRenderer.on('chat-chunk', (_event, text) => cb(text)),
  onChatDone: (cb: () => void) =>
    ipcRenderer.on('chat-done', () => cb()),
  onChatError: (cb: (msg: string) => void) =>
    ipcRenderer.on('chat-error', (_event, msg) => cb(msg)),
  offChatListeners: () => {
    ipcRenderer.removeAllListeners('chat-chunk')
    ipcRenderer.removeAllListeners('chat-done')
    ipcRenderer.removeAllListeners('chat-error')
  },
  // Phase 4: Sweep
  runSweep: () => ipcRenderer.invoke('sweep:run'),
  onSweepProgress: (cb: (status: SweepStatus) => void) =>
    ipcRenderer.on('sweep:progress', (_event, status) => cb(status)),
  offSweepListeners: () => ipcRenderer.removeAllListeners('sweep:progress'),
  // Phase 4: Vault
  validateVaultPath: (path: string) => ipcRenderer.invoke('vault:validate', path),
  selectVaultFolder: () => ipcRenderer.invoke('vault:selectFolder'),
  // Phase 4: Profile
  loadProfile: () => ipcRenderer.invoke('profile:load'),
  // Phase 4: Echo / Soul
  initEcho: (userName: string) => ipcRenderer.invoke('echo:init', userName),
  loadSoul: () => ipcRenderer.invoke('soul:load'),
  updateSoulStyle: (content: string) => ipcRenderer.invoke('soul:updateStyle', content),
  // Phase 5: Recurrence
  checkRecurringTasks: (tasks: any[]) => ipcRenderer.invoke('recurrence:check', tasks),
  // Phase 5: Priority
  suggestPriority: (tasks: any[]) => ipcRenderer.invoke('priority:suggest', tasks),
  // Connection test
  testChatConnection: (apiKey: string) => ipcRenderer.invoke('testChatConnection', apiKey),
  // Phase B: Weekly report overlay
  getPendingReport: () => ipcRenderer.invoke('sweep:getPendingReport'),
  // C-1: タグ管理
  loadTags: () => ipcRenderer.invoke('tags:load'),
  saveTags: (tags: any[]) => ipcRenderer.invoke('tags:save', tags),
  // C-3: レポート履歴
  listReports: () => ipcRenderer.invoke('reports:list'),
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
