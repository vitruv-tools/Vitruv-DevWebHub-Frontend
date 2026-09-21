/**
 * Local demo login for Hub development when Methodologist auth (:9811) is offline.
 * Replace with real accounts once the auth API is wired in production.
 */
export const DEMO_USERNAME = 'demo'
export const DEMO_PASSWORD = 'demo'

export function isDemoCredentials(username: string, password: string): boolean {
    const normalized = username.trim().toLowerCase()
    return (normalized === DEMO_USERNAME || normalized === 'demo@local') && password === DEMO_PASSWORD
}
