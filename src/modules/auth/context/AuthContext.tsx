import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react'
import { fetchCurrentUserInfo } from '../services/auth-api-client.ts'
import { AuthService } from '../services/auth-service.ts'
import type { AuthUser, SignUpCredentials, SignUpResponse } from '../types/auth-types.ts'
import { extractUserFromToken, parseJwtToken } from '../utils/jwt-parser.ts'
import { useTokenRefresh } from '../hooks/useTokenRefresh.ts'

type AuthContextValue = {
    user: AuthUser | null
    isAuthenticated: boolean
    isLoading: boolean
    signIn: (username: string, password: string) => Promise<AuthUser>
    signUp: (credentials: SignUpCredentials) => Promise<SignUpResponse>
    signOut: () => Promise<void>
    refreshToken: () => Promise<unknown>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function userFromAccessToken(fallbackUsername: string): AuthUser {
    const accessToken = AuthService.getAccessToken()
    if (!accessToken) {
        return {
            id: Date.now().toString(),
            username: fallbackUsername,
            name: fallbackUsername,
            emailVerified: false,
        }
    }

    const tokenData = parseJwtToken(accessToken)
    if (!tokenData) {
        return {
            id: Date.now().toString(),
            username: fallbackUsername,
            email: fallbackUsername.includes('@') ? fallbackUsername : undefined,
            name: fallbackUsername.split('@')[0],
            emailVerified: false,
        }
    }

    const extracted = extractUserFromToken(tokenData)
    return {
        id: Date.now().toString(),
        username: extracted.username || fallbackUsername,
        email: extracted.email,
        name: extracted.name,
        givenName: extracted.givenName,
        familyName: extracted.familyName,
        emailVerified: extracted.emailVerified === true,
        scope: extracted.scope,
    }
}

type Props = {
    children: ReactNode
}

/**
 * Core auth provider: session restore, sign-in, sign-out, refresh.
 * Does not enforce email verification yet (reserved for modules/auth/future/otp).
 */
export function AuthProvider({ children }: Props) {
    const [user, setUser] = useState<AuthUser | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    const sessionActive = !!user || AuthService.isAuthenticated()
    const { refreshToken } = useTokenRefresh(sessionActive)

    const loadUser = useCallback(async (): Promise<AuthUser | null> => {
        try {
            const { data } = await fetchCurrentUserInfo()
            return {
                id: String(data.id),
                username: data.email?.split('@')[0] || 'user',
                email: data.email,
                name: `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim() || data.email,
                givenName: data.firstName,
                familyName: data.lastName,
                emailVerified: data.emailVerified === true || data.verified === true,
            }
        } catch {
            return userFromAccessToken('user')
        }
    }, [])

    useEffect(() => {
        let cancelled = false

        async function restoreSession() {
            try {
                if (!AuthService.isAuthenticated()) {
                    return
                }

                const cached = AuthService.getCurrentUser()
                if (cached) {
                    if (!cancelled) {
                        setUser(cached)
                    }
                    return
                }

                const fetched = await loadUser()
                if (fetched && !cancelled) {
                    AuthService.setCurrentUser(fetched)
                    setUser(fetched)
                }
            } catch (error) {
                console.error('Auth restore failed:', error)
                await AuthService.signOut()
            } finally {
                if (!cancelled) {
                    setIsLoading(false)
                }
            }
        }

        void restoreSession()

        const onSignOut = () => setUser(null)
        globalThis.addEventListener('auth:signout', onSignOut)
        return () => {
            cancelled = true
            globalThis.removeEventListener('auth:signout', onSignOut)
        }
    }, [loadUser])

    const signIn = useCallback(async (username: string, password: string): Promise<AuthUser> => {
        await AuthService.signIn({ username, password })

        const cached = AuthService.getCurrentUser()
        if (cached) {
            setUser(cached)
            return cached
        }

        try {
            const { data } = await fetchCurrentUserInfo()
            const mapped: AuthUser = {
                id: String(data.id),
                username: data.email?.split('@')[0] || username,
                email: data.email,
                name: `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim() || data.email || username,
                givenName: data.firstName,
                familyName: data.lastName,
                emailVerified: data.emailVerified === true || data.verified === true,
            }
            AuthService.setCurrentUser(mapped)
            setUser(mapped)
            return mapped
        } catch {
            const accessToken = AuthService.getAccessToken()
            const tokenData = accessToken ? parseJwtToken(accessToken) : null
            const mapped = tokenData
                ? (() => {
                    const extracted = extractUserFromToken(tokenData)
                    return {
                        id: Date.now().toString(),
                        username: extracted.username || username,
                        email: extracted.email,
                        name: extracted.name,
                        givenName: extracted.givenName,
                        familyName: extracted.familyName,
                        emailVerified: extracted.emailVerified === true,
                        scope: extracted.scope,
                    } satisfies AuthUser
                })()
                : userFromAccessToken(username)

            AuthService.setCurrentUser(mapped)
            setUser(mapped)
            return mapped
        }
    }, [])

    const signUp = useCallback(async (credentials: SignUpCredentials): Promise<SignUpResponse> => {
        const response = await AuthService.signUp(credentials)

        const cached = AuthService.getCurrentUser()
        if (cached) {
            setUser(cached)
            return response
        }

        const user = await signIn(credentials.username, credentials.password)
        AuthService.setCurrentUser(user)
        setUser(user)
        return response
    }, [signIn])

    const signOut = useCallback(async () => {
        await AuthService.signOut()
        setUser(null)
    }, [])

    const handleRefreshToken = useCallback(async () => {
        try {
            return await refreshToken()
        } catch (error) {
            await AuthService.signOut()
            setUser(null)
            throw error
        }
    }, [refreshToken])

    const value = useMemo<AuthContextValue>(
        () => ({
            user,
            isAuthenticated: !!user && AuthService.isAuthenticated(),
            isLoading,
            signIn,
            signUp,
            signOut,
            refreshToken: handleRefreshToken,
        }),
        [user, isLoading, signIn, signUp, signOut, handleRefreshToken],
    )

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
