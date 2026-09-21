/**
 * JWT payload parser (from Vitruv-UI-Methodologist).
 */

export type ParsedJwtPayload = {
    scope?: string
    email_verified?: boolean
    name?: string
    preferred_username?: string
    given_name?: string
    family_name?: string
    email?: string
    [key: string]: unknown
}

export function parseJwtToken(token: string): ParsedJwtPayload | null {
    try {
        const parts = token.split('.')
        if (parts.length !== 3) {
            return null
        }

        const payload = parts[1]
        const paddedPayload = payload + '='.repeat((4 - (payload.length % 4)) % 4)
        const base64Payload = paddedPayload.replaceAll('-', '+').replaceAll('_', '/')
        const decodedPayload = atob(base64Payload)
        return JSON.parse(decodedPayload) as ParsedJwtPayload
    } catch {
        return null
    }
}

export function extractUserFromToken(tokenData: ParsedJwtPayload) {
    return {
        name: tokenData.name || `${tokenData.given_name || ''} ${tokenData.family_name || ''}`.trim(),
        email: tokenData.email,
        username: tokenData.preferred_username,
        givenName: tokenData.given_name,
        familyName: tokenData.family_name,
        emailVerified: tokenData.email_verified,
        scope: tokenData.scope,
    }
}
