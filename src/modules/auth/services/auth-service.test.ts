import { beforeEach, describe, expect, it } from 'vitest'
import { AuthService } from './auth-service.ts'
import { tokenStorage } from '../utils/token-storage.ts'
import type { AuthTokenResponse } from '../types/auth-types.ts'

function sampleTokens(overrides: Partial<AuthTokenResponse> = {}): AuthTokenResponse {
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

describe('AuthService token validity', () => {
    beforeEach(async () => {
        await AuthService.signOut()
        localStorage.removeItem('auth.local-users')
    })

    it('accepts demo credentials without calling the auth API', async () => {
        const tokens = await AuthService.signIn({ username: 'demo', password: 'demo' })
        expect(tokens.access_token).toBe('demo-access-token')
        expect(AuthService.isAuthenticated()).toBe(true)
        expect(AuthService.getCurrentUser()?.name).toBe('Demo User')
    })

    it('isAuthenticated when access token is still valid', () => {
        tokenStorage.persistTokens(sampleTokens())
        expect(AuthService.isAuthenticated()).toBe(true)
        expect(AuthService.getAccessToken()).toBe('access')
    })

    it('isAuthenticated when only refresh token is still valid', () => {
        tokenStorage.persistTokens(sampleTokens({ expires_in: 0 }))
        // Force access expired but refresh valid
        localStorage.setItem('auth.access_expires_at', String(Date.now() - 1000))
        localStorage.setItem('auth.refresh_expires_at', String(Date.now() + 60_000))
        expect(AuthService.isAuthenticated()).toBe(true)
    })

    it('clears session on signOut', async () => {
        tokenStorage.persistTokens(sampleTokens())
        tokenStorage.setProfileToken('ada', 'profile-secret')
        await AuthService.signOut()
        expect(AuthService.isAuthenticated()).toBe(false)
        expect(AuthService.getAccessToken()).toBeNull()
        expect(tokenStorage.getProfileToken('ada')).toBe('profile-secret')
    })

    it('registers and signs in a local user when auth API is offline', async () => {
        await AuthService.signUp({
            username: 'testuser',
            email: 'testuser@local',
            password: 'Password1!',
            firstName: 'Test',
            lastName: 'User',
            roleType: 'user',
        })

        expect(AuthService.isAuthenticated()).toBe(true)
        expect(AuthService.getCurrentUser()?.username).toBe('testuser')

        await AuthService.signOut()

        const tokens = await AuthService.signIn({ username: 'testuser', password: 'Password1!' })
        expect(tokens.access_token).toBe('local-testuser')
        expect(AuthService.getCurrentUser()?.email).toBe('testuser@local')
    })
})
