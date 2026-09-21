import { describe, expect, it } from 'vitest'
import { isNil, isNotNil, normalizeNil } from './nil-utils'

describe('nil-utils', () => {
    describe('isNil', () => {
        it('should return true for nil values', () => {
            expect(isNil(null)).toBe(true)
            expect(isNil(undefined)).toBe(true)
        })

        it('should return false for non-nil values', () => {
            expect(isNil('')).toBe(false)
            expect(isNil(0)).toBe(false)
            expect(isNil(false)).toBe(false)
        })
    })

    describe('isNotNil', () => {
        it('should return false for nil values', () => {
            expect(isNotNil(null)).toBe(false)
            expect(isNotNil(undefined)).toBe(false)
        })

        it('should return true for non-nil values', () => {
            expect(isNotNil('')).toBe(true)
            expect(isNotNil(0)).toBe(true)
            expect(isNotNil(false)).toBe(true)
        })
    })

    describe('normalizeNil', () => {
        it('should return undefined for nil values', () => {
            expect(normalizeNil(null)).toBeUndefined()
            expect(normalizeNil(undefined)).toBeUndefined()
        })

        it('should return the value for non-nil values', () => {
            expect(normalizeNil('test')).toBe('test')
            expect(normalizeNil(123)).toBe(123)
            expect(normalizeNil(false)).toBe(false)
        })
    })
})