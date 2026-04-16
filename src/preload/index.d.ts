import { ElectronAPI } from '@electron-toolkit/preload'
import { Task } from '../renderer/types/task'

export interface IElectronAPI {
  loadTasks: () => Promise<Task[]>
  saveTasks: (tasks: Task[]) => Promise<void>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: IElectronAPI
  }
}
