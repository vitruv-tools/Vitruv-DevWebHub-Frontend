import { describe, expect, it } from 'vitest'
import { ALLOW_MULTIPLE_SELECTED_OBJECTS, AUTH_API_BASE_URL, VITRUVIUS_SERVER_BASE_URL } from './base'

describe('test if base.ts constants are loaded correctly', () => {
    it('should have correct VITRUVIUS_SERVER_BASE_URL value', () => {
        expect(VITRUVIUS_SERVER_BASE_URL).toBe('http://localhost:8000/api')
    })

    it('should have correct AUTH_API_BASE_URL value', () => {
        expect(AUTH_API_BASE_URL).toBe('http://localhost:9811')
    })

    it('should have correct ALLOW_MULTIPLE_SELECTED_OBJECTS value', () => {
        expect(ALLOW_MULTIPLE_SELECTED_OBJECTS).toBe(true)
    })
})
