import { describe, it, expect } from 'vitest'
import { resolveVaultPath, getWeekLabel } from '../../src/main/services/vaultService'
import { homedir } from 'os'
import { join } from 'path'

describe('resolveVaultPath', () => {
  it('~/foo を絶対パスに展開する', () => {
    expect(resolveVaultPath('~/foo')).toBe(join(homedir(), 'foo'))
  })

  it('絶対パスはそのまま返す', () => {
    expect(resolveVaultPath('/absolute/path')).toBe('/absolute/path')
  })
})

describe('getWeekLabel', () => {
  it('2026-04-17 は 2026-W16', () => {
    expect(getWeekLabel(new Date('2026-04-17'))).toBe('2026-W16')
  })

  it('2026-01-01 は 2026-W01', () => {
    expect(getWeekLabel(new Date('2026-01-01'))).toBe('2026-W01')
  })

  it('2025-12-29 は 2026-W01（ISO週のまたぎ）', () => {
    expect(getWeekLabel(new Date('2025-12-29'))).toBe('2026-W01')
  })

  it('2026-12-28 は 2026-W53', () => {
    expect(getWeekLabel(new Date('2026-12-28'))).toBe('2026-W53')
  })
})
