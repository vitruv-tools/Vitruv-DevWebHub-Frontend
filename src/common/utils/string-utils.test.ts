import { describe, expect, it } from 'vitest'
import { enumeratePrefixes, randomString, stringAsBoolean, truncate } from './string-utils'

describe('string-utils', () => {
    describe('randomString', () => {
        it('should generate a string of the correct length', () => {
            expect(randomString(10)).toHaveLength(10)
            expect(randomString(0)).toHaveLength(0)
            expect(randomString(50)).toHaveLength(50)
        })

        it('should only contain alphanumeric characters', () => {
            const str = randomString(100)
            expect(str).toMatch(/^[A-Za-z0-9]+$/)
        })

        it('should generate different strings (randomness check)', () => {
            const str1 = randomString(20)
            const str2 = randomString(20)
            expect(str1).not.toBe(str2)
        })
    })

    describe('truncate', () => {
        it('should return the original string if it is shorter than or equal to maxLength', () => {
            expect(truncate('test', 10)).toBe('test')
            expect(truncate('test', 4)).toBe('test')
        })

        it('should truncate the string and add an ellipsis if it is longer than maxLength', () => {
            expect(truncate('hello world', 5)).toBe('hello…')
        })

        it('should handle grapheme clusters correctly', () => {
            // "👨‍👩‍👧‍👦" is one grapheme cluster but multiple code points
            const family = '👨‍👩‍👧‍👦'
            expect(truncate(family, 1)).toBe(family)
            expect(truncate(family + ' test', 1)).toBe(family + '…')
        })
    })

    describe('stringAsBoolean', () => {
        it('should return true for "true"', () => {
            expect(stringAsBoolean('true')).toBe(true)
        })

        it('should return false for other strings', () => {
            expect(stringAsBoolean('false')).toBe(false)
            expect(stringAsBoolean('maybe')).toBe(false)
            expect(stringAsBoolean('')).toBe(false)
        })

        it('should return the default value for nil values', () => {
            expect(stringAsBoolean(undefined, true)).toBe(true)
            expect(stringAsBoolean(null as any, true)).toBe(true)
            expect(stringAsBoolean(undefined, false)).toBe(false)
        })

        it('should handle boolean inputs directly', () => {
            expect(stringAsBoolean(true)).toBe(true)
            expect(stringAsBoolean(false)).toBe(false)
        })
    })

    describe('enumeratePrefixes', () => {
        it('should return prefixes based on the delimiter', () => {
            expect(enumeratePrefixes('a/b/c', '/')).toEqual(['a', 'a/b', 'a/b/c'])
        })

        it('should return the full string if the delimiter is not found', () => {
            expect(enumeratePrefixes('abc', '/')).toEqual(['abc'])
        })

        it('should handle multiple delimiters correctly', () => {
            expect(enumeratePrefixes('test.case.one', '.')).toEqual(['test', 'test.case', 'test.case.one'])
        })

        it('should handle empty input', () => {
            expect(enumeratePrefixes('', '/')).toEqual([''])
        })
    })
})
