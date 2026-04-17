/** スイープ処理の各フェーズ */
export type SweepPhase =
  | 'preparing'
  | 'collecting'
  | 'generating'
  | 'archiving'
  | 'cleaning'
  | 'done'
  | 'error'

/** スイープ処理の進捗状態（StatusBar表示用） */
export interface SweepStatus {
  phase: SweepPhase
  taskCount?: number
  /** ステータスバー表示用日本語メッセージ（ATCメタファー） */
  message: string
  error?: string
}
