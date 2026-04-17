import { ElectronAPI } from '@electron-toolkit/preload'
import { Task } from '../renderer/types/task'

export interface IElectronAPI {
  loadTasks: () => Promise<Task[]>
  saveTasks: (tasks: Task[]) => Promise<void>
  loadSettings: () => Promise<{ openAiApiKey?: string }>
  saveSettings: (settings: { openAiApiKey?: string }) => Promise<void>
  startChatStream: (messages: any[], systemPrompt: string, apiKey: string) => Promise<void>
  onChatChunk: (cb: (text: string) => void) => void
  onChatDone: (cb: () => void) => void
  onChatError: (cb: (msg: string) => void) => void
  offChatListeners: () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: IElectronAPI
  }
}
