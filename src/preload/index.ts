import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

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
  }
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
