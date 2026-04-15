import { describe, it, expect } from 'vitest'
import { generateFlightId } from '@renderer/utils/flightId'

describe('generateFlightId', () => {
  it('should return a string in format FS + 4 digits', () => {
    const id = generateFlightId()
    expect(id).toMatch(/^FS\d{4}$/)
  })

  it('should generate unique IDs across multiple calls', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 100; i++) {
      ids.add(generateFlightId())
    }
    // 100回の生成で少なくとも90種類以上のユニークIDが出ることを確認
    expect(ids.size).toBeGreaterThan(90)
  })

  it('should not generate IDs that collide with existing IDs', () => {
    const existingIds = ['FS1234', 'FS5678']
    const newId = generateFlightId(existingIds)
    expect(existingIds).not.toContain(newId)
  })
})
