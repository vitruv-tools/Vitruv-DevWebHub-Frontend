/**
 * Auth types adapted from Vitruv-UI-Methodologist (core + refresh only).
 * Sign-up / OTP types can be added under modules/auth/future later.
 */

export type AuthTokenResponse = {
    access_token: string
    refresh_token: string
    expires_in: number
    refresh_expires_in: number
    token_type: string
    session_state: string
    scope: string
    'not-before-policy': number
}

export type SignInCredentials = {
    username: string
    password: string
}

export type SignUpCredentials = {
    username: string
    email: string
    password: string
    firstName: string
    lastName: string
    roleType: string
}

export type SignUpResponse = {
    data?: unknown
    message?: string
    access_token?: string
    refresh_token?: string
    expires_in?: number
    refresh_expires_in?: number
    token_type?: string
    session_state?: string
    scope?: string
    'not-before-policy'?: number
}

export type RefreshTokenRequest = {
    refreshToken: string
}

export type AuthUser = {
    id: string
    username: string
    email?: string
    name?: string
    givenName?: string
    familyName?: string
    /** Reserved for future email-verify / OTP flow. */
    emailVerified?: boolean
    scope?: string
}
