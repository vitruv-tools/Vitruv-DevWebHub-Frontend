// NOTE: AI-generated test (Claude Code), only lightly reviewed. It asserts current
// behavior; if it conflicts with the requirements, trust the requirements.
// Tests the authenticated request helper: bearer token, URL building,
// retry after a 401 with a refreshed token, and error handling.

import { afterEach, describe, expect, it, vi } from 'vitest'
import { authApiRequest, fetchCurrentUserInfo } from './auth-api-client.ts'
import { AuthService } from './auth-service.ts'

function response(status: number, body: unknown = {}) {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => body,
        text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
    } as unknown as Response
}

function mockFetch(...responses: Response[]) {
    const fetchMock = vi.fn()
    for (const r of responses) fetchMock.mockResolvedValueOnce(r)
    vi.stubGlobal('fetch', fetchMock)
    return fetchMock
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
})

describe('authApiRequest', () => {
    it('throws when there is no valid token', async () => {
        vi.spyOn(AuthService, 'ensureValidToken').mockResolvedValue(null)
        await expect(authApiRequest('/api/v1/users')).rejects.toThrow('Not authenticated')
    })

    it('sends the bearer token and returns the JSON body', async () => {
        vi.spyOn(AuthService, 'ensureValidToken').mockResolvedValue('token-1')
        const fetchMock = mockFetch(response(200, { data: { id: 1 }, message: null }))

        const result = await fetchCurrentUserInfo()

        expect(result.data.id).toBe(1)
        const [url, init] = fetchMock.mock.calls[0]
        expect(url).toMatch(/\/api\/v1\/users$/)
        expect(init.headers.Authorization).toBe('Bearer token-1')
    })

    it('prefixes relative paths with a slash and keeps absolute URLs', async () => {
        vi.spyOn(AuthService, 'ensureValidToken').mockResolvedValue('token-1')
        const fetchMock = mockFetch(response(200), response(200))

        await authApiRequest('api/v1/users', { headers: { 'X-Extra': '1' } })
        await authApiRequest('https://auth.example.org/me')

        expect(fetchMock.mock.calls[0][0]).toMatch(/[^/]\/api\/v1\/users$/)
        expect(fetchMock.mock.calls[0][1].headers['X-Extra']).toBe('1')
        expect(fetchMock.mock.calls[1][0]).toBe('https://auth.example.org/me')
    })

    it('refreshes the token once after a 401 and retries', async () => {
        vi.spyOn(AuthService, 'ensureValidToken').mockResolvedValue('old')
        vi.spyOn(AuthService, 'refreshToken').mockResolvedValue({
            access_token: 'new',
        } as Awaited<ReturnType<typeof AuthService.refreshToken>>)
        const fetchMock = mockFetch(response(401), response(200, { ok: true }))

        await expect(authApiRequest('/x')).resolves.toEqual({ ok: true })
        expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer new')
    })

    it('reports an expired session when the refresh fails', async () => {
        vi.spyOn(AuthService, 'ensureValidToken').mockResolvedValue('old')
        vi.spyOn(AuthService, 'refreshToken').mockResolvedValue(null)
        mockFetch(response(401))

        await expect(authApiRequest('/x')).rejects.toThrow('Session expired')
    })

    it('throws the error body, or the status when the body is empty', async () => {
        vi.spyOn(AuthService, 'ensureValidToken').mockResolvedValue('token-1')
        mockFetch(response(400, 'Bad input'), response(500, ''))

        await expect(authApiRequest('/x')).rejects.toThrow('Bad input')
        await expect(authApiRequest('/x')).rejects.toThrow('Request failed (500)')
    })
})
