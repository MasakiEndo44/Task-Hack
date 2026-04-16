/** タスクが所属するゾーン */
export type ZoneType = 'ACTIVE' | 'NEXT_ACTION' | 'HOLDING' | 'CLEARED'

/** タスクの優先度 */
export type Priority = 'NRM' | 'URG'

/** タスクのカテゴリ（AIが自律形成するが、初期はstring） */
export type Category = string

/** ゾーンごとのタスク上限数 */
export const ZONE_LIMITS: Record<ZoneType, number> = {
  ACTIVE: 1,
  NEXT_ACTION: 5,
  HOLDING: Infinity,
  CLEARED: Infinity
}

/**
 * ゾーンがタスク上限に達しているかを判定する。
 */
export function isZoneFull(zone: ZoneType, currentCount: number): boolean {
  return currentCount >= ZONE_LIMITS[zone]
}

/** タスクデータ */
export interface Task {
  /** フライトID (FS + 4桁数字) */
  id: string

  /** タスクタイトル */
  title: string

  /** タスク詳細（任意） */
  description?: string

  /** 所要時間（分単位、任意） */
  estimatedTime?: number

  /** タスクに関するメモ（任意） */
  notes?: string

  /** サブタスク（任意） */
  subtasks?: {
    id: string
    title: string
    completed: boolean
  }[]

  /** 所属ゾーン */
  zone: ZoneType

  /** 優先度 */
  priority: Priority

  /** カテゴリ（任意） */
  category?: Category

  /** 予定開始時刻（ISO 8601文字列、任意） */
  scheduledStart?: string

  /** 予定終了時刻（ISO 8601文字列、任意） */
  scheduledEnd?: string

  /** 作成日時（ISO 8601文字列） */
  createdAt: string

  /** 完了日時（ISO 8601文字列、任意） */
  completedAt?: string

  /** ゾーン内の表示順序 */
  order: number
}

/** タスク作成時の入力（idとcreatedAtは自動生成） */
export type TaskInput = Omit<Task, 'id' | 'createdAt' | 'order'>
