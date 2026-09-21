import { normalizeAsArray } from './array-utils'
import { describe, expect, it } from 'vitest'

describe('normalizeAsArray', () => {
    it('should return an empty array if the input is undefined', () => {
        const result = normalizeAsArray(undefined)
        expect(result).toEqual([])
    })

    it('should return an empty array if the input is null', () => {
        const result = normalizeAsArray(null)
        expect(result).toEqual([])
    })

    it('should return the input as is if it is already an array', () => {
        const input = [1, 2, 3]
        const result = normalizeAsArray(input)
        expect(result).toEqual(input)
    })

    it('should wrap the input in an array if it is a single value', () => {
        const input = 42
        const result = normalizeAsArray(input)
        expect(result).toEqual([42])
    })

    it('should handle string inputs correctly and return an array containing the string', () => {
        const input = 'hello'
        const result = normalizeAsArray(input)
        expect(result).toEqual(['hello'])
    })

    it('should handle boolean inputs correctly and return an array containing the boolean', () => {
        const input = true
        const result = normalizeAsArray(input)
        expect(result).toEqual([true])
    })

    it('should handle object inputs correctly and return an array containing the object', () => {
        const input = { key: 'value' }
        const result = normalizeAsArray(input)
        expect(result).toEqual([input])
    })
})