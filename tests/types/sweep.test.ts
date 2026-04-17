import { describe, it, expect } from 'vitest'
import type { SweepStatus, SweepPhase } from '@renderer/types/sweep'

describe('SweepStatus型', () => {
  it('SweepPhaseは7種類の値を持つ', () => {
    const phases: SweepPhase[] = [
      'preparing', 'collecting', 'generating',
      'archiving', 'cleaning', 'done', 'error'
    ]
    expect(phases).toHaveLength(7)
  })

  it('SweepStatusはphaseとmessageを必須フィールドとして持つ', () => {
    const status: SweepStatus = { phase: 'done', message: '完了' }
    expect(status.phase).toBe('done')
    expect(status.message).toBe('完了')
  })

  it('taskCountとerrorはオプショナル', () => {
    const withCount: SweepStatus = { phase: 'collecting', message: '収集中', taskCount: 5 }
    const withError: SweepStatus = { phase: 'error', message: 'エラー', error: 'something failed' }
    expect(withCount.taskCount).toBe(5)
    expect(withError.error).toBe('something failed')
  })
})
