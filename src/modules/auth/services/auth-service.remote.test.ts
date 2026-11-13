// NOTE: AI-generated test (Claude Code), only lightly reviewed. It asserts current
// behavior; if it conflicts with the requirements, trust the requirements.
// Tests AuthService against a mocked auth server: error messages on sign-up failures,
// storing returned tokens, and every refreshToken path (demo, local, remote, expired).

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthService } from './auth-service.ts'
import { tokenStorage } from '../utils/token-storage.ts'
import type { AuthTokenResponse, SignUpCredentials } from '../types/auth-types.ts'

const credentials: SignUpCredentials = {
    username: 'ada',
    email: 'ada@example.org',
    password: 'Password1!',
    firstName: 'Ada',
    lastName: 'Lovelace',
    roleType: 'user',
}

function tokens(overrides: Partial<AuthTokenResponse> = {}): AuthTokenResponse {
    return {
        access_token: 'access',
        refresh_token: 'refresh',
        expires_in: 300,
        refresh_expires_in: 3600,
        token_type: 'Bearer',
        session_state: 's',
        scope: 'openid',
        'not-before-policy': 0,
        ...overrides,
    }
}

function errorResponse(status: number, body: string | (() => Promise<string>), statusText = '') {
    return {
        ok: false,
        status,
        statusText,
        text: typeof body === 'string' ? async () => body : body,
    } as unknown as Response
}

function jsonResponse(data: unknown) {
    return { ok: true, status: 200, json: async () => data } as unknown as Response
}

function mockFetch(response: Response) {
    const fetchMock = vi.fn(async () => response)
    vi.stubGlobal('fetch', fetchMock)
    return fetchMock
}

beforeEach(async () => {
    await AuthService.signOut()
    localStorage.removeItem('auth.local-users')
})

afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
})

describe('AuthService.signUp with an auth server', () => {
    it.each([
        [
            'a taken username (JSON message)',
            errorResponse(400, '{"message":"Username already exists"}'),
            'Username is already used. Please choose another username.',
        ],
        [
            'a taken email (JSON error)',
            errorResponse(400, '{"error":"Email is already used"}'),
            'Email is already used. Please use another email or sign in.',
        ],
        [
            'a conflict with a plain text body',
            errorResponse(409, 'Conflict'),
            'This username or email is already registered. Please sign in instead.',
        ],
        [
            'an empty error body',
            errorResponse(500, '', 'Internal Server Error'),
            'Internal Server Error',
        ],
        [
            'an unreadable error body',
            errorResponse(
                503,
                () => Promise.reject(new Error('stream closed')),
                'Service Unavailable',
            ),
            'Service Unavailable',
        ],
        ['no details at all', errorResponse(500, ''), 'Request failed'],
        ['a JSON body without message', errorResponse(400, '{}'), '{}'],
        [
            'an existing username',
            errorResponse(400, 'username exists'),
            'Username is already used. Please choose another username.',
        ],
        [
            'a used username',
            errorResponse(400, 'username used'),
            'Username is already used. Please choose another username.',
        ],
        [
            'an existing email',
            errorResponse(400, 'email exists'),
            'Email is already used. Please use another email or sign in.',
        ],
        [
            'a used email',
            errorResponse(400, 'email used'),
            'Email is already used. Please use another email or sign in.',
        ],
        ['an invalid username', errorResponse(400, 'username invalid'), 'username invalid'],
        ['an invalid email', errorResponse(400, 'email invalid'), 'email invalid'],
    ])('reports %s', async (_case, response, message) => {
        mockFetch(response)
        await expect(AuthService.signUp(credentials)).rejects.toThrow(message)
    })

    it('stores returned tokens on success', async () => {
        mockFetch(jsonResponse(tokens({ access_token: 'remote-access' })))

        await AuthService.signUp(credentials)

        expect(AuthService.getAccessToken()).toBe('remote-access')
    })
})

describe('AuthService.refreshToken', () => {
    it('returns null without a refresh token', async () => {
        expect(await AuthService.refreshToken()).toBeNull()
    })

    it('signs out when the refresh token has expired', async () => {
        tokenStorage.persistTokens(tokens())
        localStorage.setItem('auth.refresh_expires_at', String(Date.now() - 1000))

        expect(await AuthService.refreshToken()).toBeNull()
        expect(AuthService.isAuthenticated()).toBe(false)
    })

    it('extends a demo session locally', async () => {
        await AuthService.signIn({ username: 'demo', password: 'demo' })

        const refreshed = await AuthService.refreshToken()

        expect(refreshed?.access_token).toBe('demo-access-token')
    })

    it('extends a demo session without a stored user', async () => {
        tokenStorage.persistTokens(tokens({ refresh_token: 'demo-refresh-token' }))

        const refreshed = await AuthService.refreshToken()

        expect(refreshed?.access_token).toBe('demo-access-token')
    })

    it('extends a local user session', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => {
                throw new TypeError('offline')
            }),
        )
        await AuthService.signUp(credentials)

        const refreshed = await AuthService.refreshToken()

        expect(refreshed?.refresh_token).toBe('local-refresh-ada')
        expect(AuthService.getCurrentUser()?.email).toBe('ada@example.org')
    })

    it('signs out a local session without a stored user', async () => {
        tokenStorage.persistTokens(tokens({ refresh_token: 'local-refresh-ghost' }))

        expect(await AuthService.refreshToken()).toBeNull()
        expect(AuthService.isAuthenticated()).toBe(false)
    })

    it('stores tokens returned by the auth server', async () => {
        tokenStorage.persistTokens(tokens())
        const fetchMock = mockFetch(jsonResponse(tokens({ access_token: 'fresh' })))

        const refreshed = await AuthService.refreshToken()

        expect(refreshed?.access_token).toBe('fresh')
        expect(AuthService.getAccessToken()).toBe('fresh')
        expect(fetchMock).toHaveBeenCalledWith(
            expect.stringContaining('/api/v1/users/access-token/by-refresh-token'),
            expect.objectContaining({ method: 'POST' }),
        )
    })

    it('signs out when the auth server rejects the refresh', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
        tokenStorage.persistTokens(tokens())
        mockFetch(errorResponse(401, 'expired'))

        expect(await AuthService.refreshToken()).toBeNull()
        expect(AuthService.isAuthenticated()).toBe(false)
    })
})
