import { describe, expect, it } from 'vitest'
import { isRelevantToUser } from './relevant-to-user.ts'

describe('isRelevantToUser', () => {
    it('shows everything when the user has no selection', () => {
        expect(isRelevantToUser(['amalthea'], [])).toBe(true)
    })

    it('matches source or target, ignoring case', () => {
        expect(isRelevantToUser(['amalthea', 'ascet'], ['ASCET'])).toBe(true)
        expect(isRelevantToUser(['model'], ['amalthea'])).toBe(false)
    })

    it('keeps items whose packages are unknown', () => {
        expect(isRelevantToUser([], ['amalthea'])).toBe(true)
    })
})
