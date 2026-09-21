import { useEffect, useRef } from 'react'
import { AuthService } from '../services/auth-service.ts'

const FIVE_MINUTES_MS = 5 * 60 * 1000
const CHECK_INTERVAL_MS = 60 * 1000

/**
 * Background access-token refresh (from Methodologist).
 * Enable while the user is authenticated so the interval restarts after sign-in.
 */
export function useTokenRefresh(enabled: boolean) {
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

    useEffect(() => {
        if (!enabled || !AuthService.isAuthenticated()) {
            return
        }

        const maybeRefresh = async () => {
            const accessExpiresAt = (() => {
                const raw = localStorage.getItem('auth.access_expires_at')
                return raw ? Number.parseInt(raw, 10) : null
            })()
            if (accessExpiresAt == null) {
                return
            }
            const timeUntilExpiry = accessExpiresAt - Date.now()
            if (timeUntilExpiry < FIVE_MINUTES_MS) {
                await AuthService.refreshToken()
            }
        }

        void maybeRefresh().catch(error => {
            console.error('Initial token refresh failed:', error)
        })

        intervalRef.current = setInterval(() => {
            void maybeRefresh().catch(error => {
                console.error('Automatic token refresh failed:', error)
                if (intervalRef.current) {
                    clearInterval(intervalRef.current)
                    intervalRef.current = null
                }
            })
        }, CHECK_INTERVAL_MS)

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
            }
        }
    }, [enabled])

    return {
        refreshToken: () => AuthService.refreshToken(),
        getValidToken: () => AuthService.ensureValidToken(),
    }
}
