import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { persistProfileToken, syncUserSession } from './user-api.ts'
import { tokenStorage } from '../../auth/utils/token-storage.ts'

const profile = {
    id: '1',
    username: 'ada',
    displayName: 'Ada',
    email: 'ada@example.com',
    metamodels: [],
    profileToken: 'issued-token',
}

describe('user-api session token', () => {
    beforeEach(() => {
        localStorage.clear()
        vi.stubGlobal('fetch', vi.fn())
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        localStorage.clear()
    })

    it('does not persist the profile token when the request resolves', async () => {
        vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(profile), { status: 200 }))

        const result = await syncUserSession({ username: 'ada', name: 'Ada' })

        expect(result.profileToken).toBe('issued-token')
        expect(tokenStorage.getProfileToken('ada')).toBeNull()
    })

    it('forwards an AbortSignal to fetch', async () => {
        const controller = new AbortController()
        vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(profile), { status: 200 }))

        await syncUserSession({ username: 'ada' }, controller.signal)

        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('/v1/users/session'),
            expect.objectContaining({ signal: controller.signal }),
        )
    })

    it('persists the token only when the caller asks', () => {
        persistProfileToken(profile)
        expect(tokenStorage.getProfileToken('ada')).toBe('issued-token')
    })
})
