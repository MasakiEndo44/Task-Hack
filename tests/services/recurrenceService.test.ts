import { describe, it, expect } from 'vitest'
import { shouldGenerateToday, processRecurringTasks } from '../../src/main/services/recurrenceService'
import type { Task } from '../../src/renderer/types/task'

const base: Task = {
  id: 'FS0001', title: 'メールチェック', zone: 'HOLDING',
  priority: 'NRM', createdAt: '2026-04-17T09:00:00Z', order: 0,
  recurrence: { frequency: 'daily' }
}

describe('shouldGenerateToday', () => {
  it('daily: lastGeneratedAt未設定 → 生成すべき', () => {
    expect(shouldGenerateToday({ frequency: 'daily' })).toBe(true)
  })

  it('daily: 同日生成済み → 生成不要', () => {
    const now = new Date('2026-04-17T18:00:00Z')
    expect(shouldGenerateToday({ frequency: 'daily', lastGeneratedAt: '2026-04-17T09:00:00Z' }, now)).toBe(false)
  })

  it('daily: 翌日以降 → 生成すべき', () => {
    const now = new Date('2026-04-18T09:00:00Z')
    expect(shouldGenerateToday({ frequency: 'daily', lastGeneratedAt: '2026-04-17T09:00:00Z' }, now)).toBe(true)
  })

  it('weekly: 指定曜日でない日 → 生成不要', () => {
    // 2026-04-17 は金曜(5)。月曜(1)指定
    const now = new Date('2026-04-17T09:00:00Z')
    expect(shouldGenerateToday({ frequency: 'weekly', dayOfWeek: 1 }, now)).toBe(false)
  })

  it('weekly: 指定曜日かつ未生成 → 生成すべき', () => {
    // 2026-04-20 は月曜(1)
    const now = new Date('2026-04-20T09:00:00Z')
    expect(shouldGenerateToday({ frequency: 'weekly', dayOfWeek: 1 }, now)).toBe(true)
  })

  it('monthly: 日付一致かつ今月未生成 → 生成すべき', () => {
    const now = new Date('2026-04-17T09:00:00Z')
    expect(shouldGenerateToday(
      { frequency: 'monthly', dayOfMonth: 17, lastGeneratedAt: '2026-03-17T09:00:00Z' }, now
    )).toBe(true)
  })
})

describe('processRecurringTasks', () => {
  it('繰り返しタスクから新インスタンスが生成される', () => {
    const now = new Date('2026-04-18T09:00:00Z')
    const { generated, updatedTemplates } = processRecurringTasks([base], now)
    expect(generated).toHaveLength(1)
    expect(generated[0].zone).toBe('NEXT_ACTION')
    expect(generated[0].id).not.toBe(base.id)
    expect(updatedTemplates).toHaveLength(1)
  })

  it('同日生成済みなら再生成しない', () => {
    const now = new Date('2026-04-17T18:00:00Z')
    const task = { ...base, recurrence: { frequency: 'daily' as const, lastGeneratedAt: '2026-04-17T09:00:00Z' } }
    const { generated } = processRecurringTasks([task], now)
    expect(generated).toHaveLength(0)
  })
})
