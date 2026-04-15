import { describe, it, expect } from 'vitest'
import type { ZoneType, Priority } from '@renderer/types/task'
import { ZONE_LIMITS, isZoneFull } from '@renderer/types/task'

describe('Task type system', () => {
  it('should define all four zone types', () => {
    const zones: ZoneType[] = ['ACTIVE', 'NEXT_ACTION', 'HOLDING', 'CLEARED']
    expect(zones).toHaveLength(4)
  })

  it('should define priority levels', () => {
    const priorities: Priority[] = ['NRM', 'URG']
    expect(priorities).toHaveLength(2)
  })

  it('should enforce ACTIVE zone limit of 1', () => {
    expect(ZONE_LIMITS.ACTIVE).toBe(1)
  })

  it('should enforce NEXT_ACTION zone limit of 5', () => {
    expect(ZONE_LIMITS.NEXT_ACTION).toBe(5)
  })

  it('should have no limit for HOLDING', () => {
    expect(ZONE_LIMITS.HOLDING).toBe(Infinity)
  })

  it('should have no limit for CLEARED', () => {
    expect(ZONE_LIMITS.CLEARED).toBe(Infinity)
  })

  it('isZoneFull returns true when zone is at capacity', () => {
    expect(isZoneFull('ACTIVE', 1)).toBe(true)
    expect(isZoneFull('NEXT_ACTION', 5)).toBe(true)
  })

  it('isZoneFull returns false when zone has capacity', () => {
    expect(isZoneFull('ACTIVE', 0)).toBe(false)
    expect(isZoneFull('NEXT_ACTION', 3)).toBe(false)
    expect(isZoneFull('HOLDING', 100)).toBe(false)
    expect(isZoneFull('CLEARED', 100)).toBe(false)
  })
})
