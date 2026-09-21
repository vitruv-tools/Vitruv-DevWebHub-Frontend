import { describe, expect, it } from 'vitest'
import { extractUserFromToken, parseJwtToken } from './jwt-parser.ts'

function makeToken(payload: Record<string, unknown>): string {
    const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }))
    const body = btoa(JSON.stringify(payload)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
    return `${header}.${body}.sig`
}

describe('jwt-parser', () => {
    it('parses payload fields used for AuthUser', () => {
        const token = makeToken({
            preferred_username: 'alice',
            email: 'alice@example.com',
            given_name: 'Alice',
            family_name: 'Example',
            email_verified: true,
            scope: 'openid',
        })

        const parsed = parseJwtToken(token)
        expect(parsed).not.toBeNull()
        expect(extractUserFromToken(parsed!)).toMatchObject({
            username: 'alice',
            email: 'alice@example.com',
            emailVerified: true,
        })
    })

    it('returns null for invalid tokens', () => {
        expect(parseJwtToken('not-a-jwt')).toBeNull()
    })
})
