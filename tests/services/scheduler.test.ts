import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../src/main/services/sweepService', () => ({
  runSweep: vi.fn().mockResolvedValue(undefined)
}))

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp/task-hack-test-home')
  }
}))

import { startScheduler, stopScheduler, checkAndRunCatchup } from '../../src/main/services/scheduler'

describe('startScheduler / stopScheduler', () => {
  beforeEach(() => {
    stopScheduler()
    vi.clearAllMocks()
  })

  it('有効なcron書式でスケジューラーが起動する', () => {
    expect(() => startScheduler({ sweepSchedule: '0 22 * * 0' }, async () => ({}))).not.toThrow()
    stopScheduler()
  })

  it('無効なcron書式でもエラーをスローしない', () => {
    expect(() => startScheduler({ sweepSchedule: 'invalid cron' }, async () => ({}))).not.toThrow()
  })

  it('stopSchedulerを複数回呼んでもエラーにならない', () => {
    stopScheduler()
    stopScheduler()
    expect(true).toBe(true)
  })
})

describe('checkAndRunCatchup', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lastSweepAtがnullの場合はrunSweepを呼ばない', async () => {
    const { runSweep } = await import('../../src/main/services/sweepService')
    await checkAndRunCatchup({ lastSweepAt: null }, async () => ({}))
    expect(runSweep).not.toHaveBeenCalled()
  })

  it('lastSweepAtがundefinedの場合はrunSweepを呼ばない', async () => {
    const { runSweep } = await import('../../src/main/services/sweepService')
    await checkAndRunCatchup({}, async () => ({}))
    expect(runSweep).not.toHaveBeenCalled()
  })

  it('7日未満の場合はrunSweepのsetTimeoutをスケジュールしない', async () => {
    const { runSweep } = await import('../../src/main/services/sweepService')
    const recentDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    await checkAndRunCatchup({ lastSweepAt: recentDate }, async () => ({}))
    expect(runSweep).not.toHaveBeenCalled()
  })
})
