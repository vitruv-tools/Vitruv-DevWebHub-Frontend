import type { AuthTokenResponse, AuthUser } from '../types/auth-types.ts'

const KEYS = {
    accessToken: 'auth.access_token',
    refreshToken: 'auth.refresh_token',
    expiresIn: 'auth.expires_in',
    refreshExpiresIn: 'auth.refresh_expires_in',
    tokenType: 'auth.token_type',
    sessionState: 'auth.session_state',
    scope: 'auth.scope',
    notBeforePolicy: 'auth.not_before_policy',
    accessExpiresAt: 'auth.access_expires_at',
    refreshExpiresAt: 'auth.refresh_expires_at',
    user: 'auth.user',
} as const

function profileTokenKey(username: string): string {
    return `profile.token.${username.trim().toLowerCase()}`
}

/**
 * localStorage helpers for JWT access/refresh tokens (Methodologist-compatible keys).
 */
export const tokenStorage = {
    persistTokens(data: AuthTokenResponse): void {
        localStorage.setItem(KEYS.accessToken, data.access_token)
        localStorage.setItem(KEYS.refreshToken, data.refresh_token)
        localStorage.setItem(KEYS.expiresIn, String(data.expires_in))
        localStorage.setItem(KEYS.refreshExpiresIn, String(data.refresh_expires_in))
        localStorage.setItem(KEYS.tokenType, data.token_type)
        localStorage.setItem(KEYS.sessionState, data.session_state)
        localStorage.setItem(KEYS.scope, data.scope)
        localStorage.setItem(KEYS.notBeforePolicy, String(data['not-before-policy']))

        const now = Date.now()
        localStorage.setItem(KEYS.accessExpiresAt, String(now + data.expires_in * 1000))
        localStorage.setItem(KEYS.refreshExpiresAt, String(now + data.refresh_expires_in * 1000))
    },

    clear(): void {
        for (const key of Object.values(KEYS)) {
            localStorage.removeItem(key)
        }
        // Keep profile.token.* keys. They prove ownership of a hub profile and
        // are not reissued on sign-in, so clearing them would lock the user out
        // of their own settings.
    },

    getProfileToken(username: string): string | null {
        return localStorage.getItem(profileTokenKey(username))
    },

    setProfileToken(username: string, token: string): void {
        localStorage.setItem(profileTokenKey(username), token)
    },

    getAccessToken(): string | null {
        return localStorage.getItem(KEYS.accessToken)
    },

    getRefreshToken(): string | null {
        return localStorage.getItem(KEYS.refreshToken)
    },

    getAccessExpiresAt(): number | null {
        const raw = localStorage.getItem(KEYS.accessExpiresAt)
        if (!raw) {
            return null
        }
        const value = Number.parseInt(raw, 10)
        return Number.isFinite(value) ? value : null
    },

    getRefreshExpiresAt(): number | null {
        const raw = localStorage.getItem(KEYS.refreshExpiresAt)
        if (!raw) {
            return null
        }
        const value = Number.parseInt(raw, 10)
        return Number.isFinite(value) ? value : null
    },

    getUser(): AuthUser | null {
        const raw = localStorage.getItem(KEYS.user)
        if (!raw) {
            return null
        }
        try {
            return JSON.parse(raw) as AuthUser
        } catch {
            return null
        }
    },

    setUser(user: AuthUser): void {
        localStorage.setItem(KEYS.user, JSON.stringify(user))
    },
}
