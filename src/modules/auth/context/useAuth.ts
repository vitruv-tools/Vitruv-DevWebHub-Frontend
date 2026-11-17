import { createContext, useContext } from 'react'
import type { AuthUser, SignUpCredentials, SignUpResponse } from '../types/auth-types.ts'

export type AuthContextValue = {
    user: AuthUser | null
    isAuthenticated: boolean
    isLoading: boolean
    signIn: (username: string, password: string) => Promise<AuthUser>
    signUp: (credentials: SignUpCredentials) => Promise<SignUpResponse>
    signOut: () => Promise<void>
    refreshToken: () => Promise<unknown>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
