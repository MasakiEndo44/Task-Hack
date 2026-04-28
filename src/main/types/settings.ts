/** アプリ設定の完全スキーマ */
export interface AppSettings {
  openAiApiKey?: string
  timerDefault?: number
  obsidianVaultPath?: string
  /** node-cron書式 例: "0 22 * * 0" = 毎週日曜22時 */
  sweepSchedule?: string
  lastSweepAt?: string | null
  userName?: string
  lastFlightId?: number
}

export const DEFAULT_SETTINGS: Pick<AppSettings, 'timerDefault' | 'sweepSchedule'> = {
  timerDefault: 25,
  sweepSchedule: '0 22 * * 0',
}
