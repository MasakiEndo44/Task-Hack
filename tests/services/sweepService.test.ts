import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSend = vi.fn()
vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => '/tmp/test') },
  BrowserWindow: {
    getAllWindows: vi.fn(() => [{ isDestroyed: () => false, webContents: { send: mockSend } }])
  }
}))

const mockFs = vi.hoisted(() => ({
  readFile: vi.fn(),
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
  copyFile: vi.fn().mockResolvedValue(undefined),
  unlink: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('fs/promises', () => ({ default: mockFs }))

vi.mock('../../src/main/services/reportService', () => ({
  generateWeeklyReport: vi.fn().mockResolvedValue({
    reportMd: '# レポート',
    archiveMd: '# アーカイブ',
    profileUpdates: { patterns: '', insights: '' }
  })
}))

vi.mock('../../src/main/services/vaultService', () => ({
  getWeekLabel: vi.fn(() => '2026-W16'),
  writeWeeklyReport: vi.fn().mockResolvedValue(''),
  writeArchiveMd: vi.fn().mockResolvedValue(''),
  writeLocalArchive: vi.fn().mockResolvedValue(''),
  resolveVaultPath: vi.fn(p => p),
}))

vi.mock('../../src/main/services/profileService', () => ({
  saveProfileSection: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../src/main/services/soulService', () => ({
  loadSoul: vi.fn().mockResolvedValue(null),
  syncSoulToVault: vi.fn().mockResolvedValue(undefined),
}))

import { runSweep } from '../../src/main/services/sweepService'
import { writeLocalArchive } from '../../src/main/services/vaultService'
import type { SweepStatus } from '../../src/renderer/types/sweep'

describe('runSweep', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSend.mockClear()
  })

  it('タスクファイルが存在しない場合はdoneを送信して終了', async () => {
    mockFs.readFile.mockRejectedValueOnce(Object.assign(new Error('not found'), { code: 'ENOENT' }))
    await runSweep({})
    const calls: [string, SweepStatus][] = mockSend.mock.calls
    const phases = calls.map(([, s]) => s.phase)
    expect(phases).toContain('done')
    expect(writeLocalArchive).not.toHaveBeenCalled()
  })

  it('CLEAREDタスクが0件の場合はwriteLocalArchiveを呼ばない', async () => {
    mockFs.readFile.mockResolvedValueOnce(JSON.stringify([
      { id: 'FS0001', zone: 'ACTIVE', title: 'active task', priority: 'NRM', createdAt: '', order: 0 }
    ]))
    await runSweep({ openAiApiKey: 'sk-test' })
    expect(writeLocalArchive).not.toHaveBeenCalled()
  })

  it('Vault未設定の場合はwriteLocalArchiveが呼ばれる', async () => {
    mockFs.readFile
      .mockResolvedValueOnce(JSON.stringify([
        { id: 'FS0002', zone: 'CLEARED', title: 'done task', priority: 'NRM', createdAt: '', completedAt: '', order: 0 }
      ]))
      .mockRejectedValue(Object.assign(new Error(), { code: 'ENOENT' })) // settings.json
    await runSweep({ openAiApiKey: 'sk-test' })
    expect(writeLocalArchive).toHaveBeenCalledWith(
      expect.stringContaining('.task-hack'),
      '2026-W16',
      expect.any(Array)
    )
  })

  it('スイープ完了後にdoneフェーズが送信される', async () => {
    mockFs.readFile
      .mockResolvedValueOnce(JSON.stringify([
        { id: 'FS0003', zone: 'CLEARED', title: 'task', priority: 'NRM', createdAt: '', completedAt: '', order: 0 }
      ]))
      .mockRejectedValue(Object.assign(new Error(), { code: 'ENOENT' }))
    await runSweep({ openAiApiKey: 'sk-test' })
    const phases = mockSend.mock.calls.map(([, s]: [string, SweepStatus]) => s.phase)
    expect(phases).toContain('done')
  })
})
