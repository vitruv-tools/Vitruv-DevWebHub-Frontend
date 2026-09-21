import { AUTH_API_BASE_URL } from '../../../base.ts'
import { AuthService } from './auth-service.ts'

type UserInfoPayload = {
    data: {
        id: number
        email: string
        firstName: string
        lastName: string
        emailVerified?: boolean
        verified?: boolean
    }
    message: string | null
}

/**
 * Thin authenticated HTTP helper for the Methodologist auth API.
 * Retries once after refresh on 401. Extend here for future OTP / user-profile calls.
 */
export async function authApiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
    const base = AUTH_API_BASE_URL.replace(/\/$/, '')
    const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`

    const token = await AuthService.ensureValidToken()
    if (!token) {
        throw new Error('Not authenticated')
    }

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init.headers as Record<string, string> | undefined),
    }

    let response = await fetch(url, { ...init, headers })

    if (response.status === 401) {
        const refreshed = await AuthService.refreshToken()
        if (!refreshed?.access_token) {
            throw new Error('Session expired')
        }
        headers.Authorization = `Bearer ${refreshed.access_token}`
        response = await fetch(url, { ...init, headers })
    }

    if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(text || `Request failed (${response.status})`)
    }

    return (await response.json()) as T
}

export async function fetchCurrentUserInfo(): Promise<UserInfoPayload> {
    return authApiRequest<UserInfoPayload>('/api/v1/users')
}
