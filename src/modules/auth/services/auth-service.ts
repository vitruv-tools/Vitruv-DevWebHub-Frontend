import { AUTH_API_BASE_URL } from '../../../base.ts'
import { isDemoCredentials } from '../demo-credentials.ts'
import type {
    AuthTokenResponse,
    AuthUser,
    RefreshTokenRequest,
    SignInCredentials,
    SignUpCredentials,
    SignUpResponse,
} from '../types/auth-types.ts'
import { findLocalUser, registerLocalUser } from '../utils/local-user-registry.ts'
import { tokenStorage } from '../utils/token-storage.ts'

async function readErrorMessage(response: Response): Promise<string> {
    let errorText = ''
    try {
        errorText = await response.text()
    } catch {
        /* ignore */
    }
    try {
        const parsed = JSON.parse(errorText) as { message?: string; error?: string }
        return parsed.message || parsed.error || errorText || response.statusText || 'Request failed'
    } catch {
        return errorText || response.statusText || 'Request failed'
    }
}

/**
 * Core auth API: sign-in, refresh, sign-out, token validity.
 * Targets Methodologist backend (`VITE_AUTH_API_BASE_URL`, default http://localhost:9811).
 */
export class AuthService {
    private static apiBase(): string {
        return AUTH_API_BASE_URL.replace(/\/$/, '')
    }

    static async signIn(credentials: SignInCredentials): Promise<AuthTokenResponse> {
        if (isDemoCredentials(credentials.username, credentials.password)) {
            return this.issueDemoSession(credentials.username.trim())
        }

        const localUser = findLocalUser(credentials.username, credentials.password)
        if (localUser) {
            return this.issueLocalUserSession(localUser)
        }

        let response: Response
        try {
            response = await fetch(`${this.apiBase()}/api/v1/users/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials),
            })
        } catch {
            throw new Error(
                'Auth server unreachable. Use demo / demo for local Hub access, or start the Methodologist API on :9811.',
            )
        }

        if (!response.ok) {
            throw new Error(await readErrorMessage(response))
        }

        const data = (await response.json()) as AuthTokenResponse
        tokenStorage.persistTokens(data)
        return data
    }

    /** Issues a local session without calling the Methodologist API. */
    static issueDemoSession(username: string): AuthTokenResponse {
        const data: AuthTokenResponse = {
            access_token: 'demo-access-token',
            refresh_token: 'demo-refresh-token',
            expires_in: 60 * 60 * 8,
            refresh_expires_in: 60 * 60 * 24,
            token_type: 'Bearer',
            session_state: 'demo-session',
            scope: 'openid profile',
            'not-before-policy': 0,
        }
        tokenStorage.persistTokens(data)
        const user: AuthUser = {
            id: 'demo-user',
            username: username.toLowerCase() === 'demo@local' ? 'demo' : username,
            email: 'demo@local',
            name: 'Demo User',
            emailVerified: true,
            scope: data.scope,
        }
        tokenStorage.setUser(user)
        return data
    }

    static issueLocalUserSession(user: SignUpCredentials): AuthTokenResponse {
        const data: AuthTokenResponse = {
            access_token: `local-${user.username}`,
            refresh_token: `local-refresh-${user.username}`,
            expires_in: 60 * 60 * 8,
            refresh_expires_in: 60 * 60 * 24,
            token_type: 'Bearer',
            session_state: 'local-session',
            scope: 'openid profile',
            'not-before-policy': 0,
        }
        tokenStorage.persistTokens(data)
        const authUser: AuthUser = {
            id: `local-${user.username}`,
            username: user.username,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`.trim() || user.username,
            givenName: user.firstName,
            familyName: user.lastName,
            emailVerified: true,
            scope: data.scope,
        }
        tokenStorage.setUser(authUser)
        return data
    }

    static async signUp(credentials: SignUpCredentials): Promise<SignUpResponse> {
        let response: Response
        try {
            response = await fetch(`${this.apiBase()}/api/v1/users/sign-up`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials),
            })
        } catch {
            registerLocalUser(credentials)
            this.issueLocalUserSession(credentials)
            return {
                message: 'Account created locally (auth server offline). You are now signed in.',
            }
        }

        if (!response.ok) {
            const message = await readErrorMessage(response)
            const normalized = message.toLowerCase()
            if (normalized.includes('username') && (normalized.includes('already') || normalized.includes('exists') || normalized.includes('used'))) {
                throw new Error('Username is already used. Please choose another username.')
            }
            if (normalized.includes('email') && (normalized.includes('already') || normalized.includes('exists') || normalized.includes('used'))) {
                throw new Error('Email is already used. Please use another email or sign in.')
            }
            if (response.status === 409) {
                throw new Error('This username or email is already registered. Please sign in instead.')
            }
            throw new Error(message)
        }

        const responseData = (await response.json()) as SignUpResponse
        const tokenData = responseData.access_token ? responseData : responseData
        if (tokenData.access_token) {
            tokenStorage.persistTokens(tokenData as AuthTokenResponse)
        } else {
            await this.signIn({ username: credentials.username, password: credentials.password })
        }

        return responseData
    }

    static async refreshToken(): Promise<AuthTokenResponse | null> {
        const refreshToken = tokenStorage.getRefreshToken()
        const refreshExpiresAt = tokenStorage.getRefreshExpiresAt()

        if (!refreshToken || refreshExpiresAt == null) {
            return null
        }

        if (Date.now() >= refreshExpiresAt) {
            await this.signOut()
            return null
        }

        // Demo session: extend locally (no Methodologist API).
        if (refreshToken === 'demo-refresh-token' || tokenStorage.getAccessToken() === 'demo-access-token') {
            const user = tokenStorage.getUser()
            return this.issueDemoSession(user?.username ?? 'demo')
        }

        if (refreshToken.startsWith('local-refresh-')) {
            const user = tokenStorage.getUser()
            if (!user) {
                await this.signOut()
                return null
            }
            return this.issueLocalUserSession({
                username: user.username,
                email: user.email ?? `${user.username}@local`,
                password: 'unused',
                firstName: user.givenName ?? user.username,
                lastName: user.familyName ?? '',
                roleType: 'user',
            })
        }

        try {
            const body: RefreshTokenRequest = { refreshToken }
            const response = await fetch(`${this.apiBase()}/api/v1/users/access-token/by-refresh-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const data = (await response.json()) as AuthTokenResponse
            tokenStorage.persistTokens(data)
            return data
        } catch (error) {
            console.error('Failed to refresh token:', error)
            await this.signOut()
            return null
        }
    }

    static async signOut(): Promise<void> {
        tokenStorage.clear()
        try {
            globalThis.dispatchEvent(new Event('auth:signout'))
        } catch {
            /* ignore */
        }
    }

    static isAuthenticated(): boolean {
        const now = Date.now()
        const accessToken = tokenStorage.getAccessToken()
        const accessExpiresAt = tokenStorage.getAccessExpiresAt()
        const refreshToken = tokenStorage.getRefreshToken()
        const refreshExpiresAt = tokenStorage.getRefreshExpiresAt()

        const accessValid = !!accessToken && accessExpiresAt != null && now < accessExpiresAt
        const refreshValid = !!refreshToken && refreshExpiresAt != null && now < refreshExpiresAt
        return accessValid || refreshValid
    }

    static async ensureValidToken(): Promise<string | null> {
        const now = Date.now()
        const accessToken = tokenStorage.getAccessToken()
        const accessExpiresAt = tokenStorage.getAccessExpiresAt()

        if (accessToken && accessExpiresAt != null && now < accessExpiresAt) {
            return accessToken
        }

        const refreshToken = tokenStorage.getRefreshToken()
        const refreshExpiresAt = tokenStorage.getRefreshExpiresAt()
        if (!refreshToken || refreshExpiresAt == null || now >= refreshExpiresAt) {
            await this.signOut()
            return null
        }

        const refreshed = await this.refreshToken()
        if (refreshed?.access_token) {
            return refreshed.access_token
        }

        await this.signOut()
        return null
    }

    static getAccessToken(): string | null {
        if (!this.isAuthenticated()) {
            return null
        }
        return tokenStorage.getAccessToken()
    }

    static getCurrentUser(): AuthUser | null {
        return tokenStorage.getUser()
    }

    static setCurrentUser(user: AuthUser): void {
        tokenStorage.setUser(user)
    }
}
