import { ElectronAPI } from '@electron-toolkit/preload'
import { Task } from '../renderer/types/task'
import { SweepStatus } from '../renderer/types/sweep'

export interface IElectronAPI {
  loadTasks: () => Promise<Task[]>
  saveTasks: (tasks: Task[]) => Promise<void>
  loadSettings: () => Promise<{ openAiApiKey?: string; timerDefault?: number; obsidianVaultPath?: string; sweepSchedule?: string; userName?: string }>
  saveSettings: (settings: any) => Promise<void>
  startChatStream: (messages: any[], systemPrompt: string, apiKey: string) => Promise<void>
  onChatChunk: (cb: (text: string) => void) => void
  onChatDone: (cb: () => void) => void
  onChatError: (cb: (msg: string) => void) => void
  offChatListeners: () => void
  // Phase 4: Sweep
  runSweep: () => Promise<void>
  onSweepProgress: (cb: (status: SweepStatus) => void) => void
  offSweepListeners: () => void
  // Phase 4: Vault
  validateVaultPath: (path: string) => Promise<{ valid: boolean; error?: string }>
  selectVaultFolder: () => Promise<string | null>
  // Phase 4: Profile
  loadProfile: () => Promise<Record<string, string>>
  // Phase 4: Echo / Soul
  initEcho: (userName: string) => Promise<string>
  loadSoul: () => Promise<string | null>
  updateSoulStyle: (content: string) => Promise<void>
  // Phase 5: Recurrence
  checkRecurringTasks: (tasks: Task[]) => Promise<{ generated: Task[]; updatedTemplates: Task[] }>
  // Phase 5: Priority
  suggestPriority: (tasks: Task[]) => Promise<{ proposals: Array<{ taskId: string; title: string; suggestedZone: string; reason: string }>; summary: string }>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: IElectronAPI
  }
}
