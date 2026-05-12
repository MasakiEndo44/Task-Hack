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
  /** done フェーズのみ: 生成された週次レポートのMarkdown本文 */
  reportMd?: string
  /** done フェーズのみ: 週次レポートの週ラベル (例: "2026-W20") */
  weekLabel?: string
}
