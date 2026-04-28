import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => '/tmp/test-home') }
}))

const mockFs = vi.hoisted(() => ({
  readFile: vi.fn(),
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('fs/promises', () => ({ default: mockFs }))

import { loadSoul, saveSoul, initEcho, buildLayeredPrompt } from '../../src/main/services/soulService'

describe('loadSoul', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ファイルが存在する場合: 内容を返す', async () => {
    mockFs.readFile.mockResolvedValueOnce('# Echo Soul')
    const result = await loadSoul()
    expect(result).toBe('# Echo Soul')
  })

  it('ファイルが存在しない場合(ENOENT): nullを返す', async () => {
    mockFs.readFile.mockRejectedValueOnce(Object.assign(new Error('not found'), { code: 'ENOENT' }))
    const result = await loadSoul()
    expect(result).toBeNull()
  })

  it('ENOENT以外のエラーはスローする', async () => {
    mockFs.readFile.mockRejectedValueOnce(Object.assign(new Error('permission denied'), { code: 'EACCES' }))
    await expect(loadSoul()).rejects.toThrow('permission denied')
  })
})

describe('saveSoul', () => {
  beforeEach(() => vi.clearAllMocks())

  it('mkdirを呼んでからwriteFileを呼ぶ', async () => {
    await saveSoul('# content')
    expect(mockFs.mkdir).toHaveBeenCalledWith(expect.stringContaining('ai'), { recursive: true })
    expect(mockFs.writeFile).toHaveBeenCalledWith(expect.stringContaining('soul.md'), '# content', 'utf-8')
  })
})

describe('initEcho', () => {
  beforeEach(() => vi.clearAllMocks())

  it('soul.mdが存在しない場合: テンプレートからuserNameを埋め込んで生成', async () => {
    mockFs.readFile.mockRejectedValueOnce(Object.assign(new Error(), { code: 'ENOENT' }))
    const result = await initEcho('みさき')
    expect(result).toContain('みさき')
    expect(mockFs.writeFile).toHaveBeenCalled()
  })

  it('soul.mdが存在する場合: 既存内容をそのまま返す', async () => {
    mockFs.readFile.mockResolvedValueOnce('# 既存のSoul')
    const result = await initEcho('みさき')
    expect(result).toBe('# 既存のSoul')
    expect(mockFs.writeFile).not.toHaveBeenCalled()
  })

  it('{{createdAt}}が実際の日時で置換される', async () => {
    mockFs.readFile.mockRejectedValueOnce(Object.assign(new Error(), { code: 'ENOENT' }))
    const result = await initEcho('テスト')
    expect(result).not.toContain('{{createdAt}}')
    expect(result).not.toContain('{{userName}}')
  })
})

describe('buildLayeredPrompt', () => {
  beforeEach(() => vi.clearAllMocks())

  it('soul.mdの内容とrequestが --- で結合される', async () => {
    mockFs.readFile.mockResolvedValueOnce('# Soul Layer')
    const prompt = await buildLayeredPrompt({ request: '# Layer 4 Request' })
    expect(prompt).toContain('# Soul Layer')
    expect(prompt).toContain('---')
    expect(prompt).toContain('# Layer 4 Request')
  })

  it('soul.mdがnullの場合もエラーにならない', async () => {
    mockFs.readFile.mockRejectedValueOnce(Object.assign(new Error(), { code: 'ENOENT' }))
    const prompt = await buildLayeredPrompt({ request: 'test request' })
    expect(prompt).toContain('test request')
  })

  it('loadContextFnが提供された場合、ユーザーコンテキストを読み込む', async () => {
    mockFs.readFile.mockResolvedValueOnce('# Soul')
    const mockLoader = vi.fn().mockResolvedValue('## パターン内容')
    const prompt = await buildLayeredPrompt(
      { request: 'req' },
      mockLoader
    )
    expect(mockLoader).toHaveBeenCalled()
    expect(prompt).toContain('パターン内容')
  })
})
