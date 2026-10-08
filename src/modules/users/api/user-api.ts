import { VITRUVIUS_SERVER_BASE_URL } from '../../../base.ts'
import { tokenStorage } from '../../auth/utils/token-storage.ts'

export type UserProfile = {
    id: string
    username: string
    displayName?: string | null
    email?: string | null
    createdAt?: string | null
    lastLoginAt?: string | null
    metamodels: string[]
    profileToken?: string | null
}

export type KnowledgeMetamodel = {
    name: string
    label: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${VITRUVIUS_SERVER_BASE_URL}${path}`, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            ...(init?.headers ?? {}),
        },
    })
    if (!response.ok) {
        const text = await response.text()
        throw new Error(text || `Request failed (${response.status})`)
    }
    return response.json() as Promise<T>
}

function profileHeaders(username: string): HeadersInit {
    const token = tokenStorage.getProfileToken(username)
    return token ? { 'X-Profile-Token': token } : {}
}

export function syncUserSession(user: {
    username: string
    name?: string
    email?: string
}): Promise<UserProfile> {
    return request<UserProfile>('/v1/users/session', {
        method: 'POST',
        headers: profileHeaders(user.username),
        body: JSON.stringify({
            username: user.username,
            displayName: user.name || user.username,
            email: user.email ?? null,
        }),
    }).then(profile => {
        if (profile.profileToken) {
            tokenStorage.setProfileToken(profile.username, profile.profileToken)
        }
        return profile
    })
}

export function getUserProfile(username: string): Promise<UserProfile> {
    return request<UserProfile>(`/v1/users/${encodeURIComponent(username)}`, {
        headers: profileHeaders(username),
    })
}

export function listKnowledgeMetamodels(): Promise<KnowledgeMetamodel[]> {
    return request<KnowledgeMetamodel[]>('/v1/users/knowledge-metamodels')
}

export function updateUserMetamodels(username: string, metamodels: string[]): Promise<UserProfile> {
    return request<UserProfile>(`/v1/users/${encodeURIComponent(username)}/metamodels`, {
        method: 'PUT',
        headers: profileHeaders(username),
        body: JSON.stringify({ metamodels }),
    })
}
