import type { SignUpCredentials } from '../types/auth-types.ts'

export type LocalRegisteredUser = SignUpCredentials

const STORAGE_KEY = 'auth.local-users'

function loadUsers(): LocalRegisteredUser[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) {
            return []
        }
        const parsed = JSON.parse(raw) as LocalRegisteredUser[]
        return Array.isArray(parsed) ? parsed : []
    } catch {
        return []
    }
}

function saveUsers(users: LocalRegisteredUser[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users))
}

export function findLocalUser(usernameOrEmail: string, password: string): LocalRegisteredUser | undefined {
    const normalized = usernameOrEmail.trim().toLowerCase()
    return loadUsers().find(user =>
        (user.username.toLowerCase() === normalized || user.email.toLowerCase() === normalized)
        && user.password === password,
    )
}

export function registerLocalUser(credentials: SignUpCredentials): void {
    const users = loadUsers()
    const usernameTaken = users.some(user => user.username.toLowerCase() === credentials.username.toLowerCase())
    const emailTaken = users.some(user => user.email.toLowerCase() === credentials.email.toLowerCase())

    if (usernameTaken) {
        throw new Error('Username is already used. Please choose another username.')
    }
    if (emailTaken) {
        throw new Error('Email is already used. Please use another email or sign in.')
    }

    users.push(credentials)
    saveUsers(users)
}
