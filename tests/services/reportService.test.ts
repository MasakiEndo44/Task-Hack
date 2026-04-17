import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => '/tmp/test-home') }
}))

const mockFs = vi.hoisted(() => ({
  readFile: vi.fn().mockRejectedValue(Object.assign(new Error(), { code: 'ENOENT' })),
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('fs/promises', () => ({ default: mockFs }))

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: '# 週次レポート 2026-W16\n## テスト内容' } }]
        })
      }
    }
  }))
}))

import { buildArchiveMd, generateWeeklyReport } from '../../src/main/services/reportService'
import type { Task } from '../../src/renderer/types/task'

const mockTask: Task = {
  id: 'FS0001',
  title: 'テストタスク',
  zone: 'CLEARED',
  priority: 'NRM',
  createdAt: '2026-04-15T10:00:00Z',
  completedAt: '2026-04-16T14:00:00Z',
  order: 0
}

describe('buildArchiveMd', () => {
  it('タスクリストからMarkdownテーブルを生成する', () => {
    const md = buildArchiveMd([mockTask], '2026-W16')
    expect(md).toContain('2026-W16')
    expect(md).toContain('FS0001')
    expect(md).toContain('テストタスク')
  })

  it('タスクが0件でも正常に動作する', () => {
    const md = buildArchiveMd([], '2026-W16')
    expect(md).toContain('タスクなし')
  })
})

describe('generateWeeklyReport', () => {
  beforeEach(() => vi.clearAllMocks())

  it('APIキーが空の場合はエラーをスロー', async () => {
    await expect(generateWeeklyReport('', [], '2026-W16')).rejects.toThrow('APIキー')
  })

  it('APIキーが有効な場合はreportMdとarchiveMdを返す', async () => {
    // profile reads return empty (ENOENT)
    mockFs.readFile.mockRejectedValue(Object.assign(new Error(), { code: 'ENOENT' }))
    const result = await generateWeeklyReport('sk-test', [mockTask], '2026-W16')
    expect(result.reportMd).toBeTruthy()
    expect(result.archiveMd).toContain('2026-W16')
  })
})
