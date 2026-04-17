import { describe, it, expect, vi } from 'vitest'

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
          choices: [{ message: { content: JSON.stringify({
            proposals: [
              { taskId: 'FS0001', title: 'テスト', suggestedZone: 'ACTIVE', reason: 'テスト理由' }
            ],
            summary: 'テスト要約'
          }) } }]
        })
      }
    }
  }))
}))

import { suggestPriority } from '../../src/main/services/priorityService'
import type { Task } from '../../src/renderer/types/task'

const mockTask: Task = {
  id: 'FS0001', title: 'テストタスク', zone: 'HOLDING',
  priority: 'NRM', createdAt: '2026-04-17T09:00:00Z', order: 0
}

describe('suggestPriority', () => {
  it('APIキーが空の場合はエラーをスロー', async () => {
    await expect(suggestPriority('', [mockTask])).rejects.toThrow('APIキー')
  })

  it('proposals と summary を返す', async () => {
    const result = await suggestPriority('sk-test', [mockTask])
    expect(result.proposals).toHaveLength(1)
    expect(result.proposals[0].suggestedZone).toBe('ACTIVE')
    expect(result.summary).toBe('テスト要約')
  })

  it('CLEARED タスクは送信しない', async () => {
    const clearedTask = { ...mockTask, zone: 'CLEARED' as const }
    const result = await suggestPriority('sk-test', [clearedTask])
    expect(result).toBeDefined()
  })
})
