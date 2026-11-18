import { act, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AuthUser } from '../../auth/types/auth-types.ts'
import { listKnowledgeMetamodels, syncUserSession, type UserProfile } from '../api/user-api.ts'
import { ModelKnowledgeProvider } from './ModelKnowledgeContext.tsx'
import { type ModelKnowledgeContextValue, useModelKnowledge } from './useModelKnowledge.ts'

const auth = { user: null as AuthUser | null }

vi.mock('../../auth/context/useAuth.ts', () => ({
    useAuth: () => auth,
}))
vi.mock('../api/user-api.ts', () => ({
    listKnowledgeMetamodels: vi.fn(),
    persistProfileToken: vi.fn(),
    syncUserSession: vi.fn(),
    updateUserMetamodels: vi.fn(),
}))
vi.mock('../view/ModelKnowledgeDialog.tsx', () => ({ ModelKnowledgeDialog: () => null }))

function profile(metamodels: string[]): UserProfile {
    return { metamodels } as UserProfile
}

function renderProvider() {
    const latest: { current?: ModelKnowledgeContextValue } = {}
    function Probe() {
        latest.current = useModelKnowledge()
        return null
    }
    const tree = () => (
        <ModelKnowledgeProvider>
            <Probe />
        </ModelKnowledgeProvider>
    )
    const result = render(tree())
    return { latest, rerender: () => result.rerender(tree()) }
}

describe('ModelKnowledgeProvider', () => {
    afterEach(() => {
        vi.resetAllMocks()
        auth.user = null
    })

    it("drops the previous user's metamodels as soon as another user signs in", async () => {
        vi.mocked(listKnowledgeMetamodels).mockResolvedValue([])
        vi.mocked(syncUserSession)
            .mockResolvedValueOnce(profile(['amalthea']))
            .mockReturnValueOnce(new Promise(() => {}))
        auth.user = { username: 'alice' } as AuthUser

        const { latest, rerender } = renderProvider()
        await act(async () => {})
        expect(latest.current?.knownMetamodels).toEqual(['amalthea'])

        auth.user = { username: 'bob' } as AuthUser
        rerender()

        expect(latest.current?.knownMetamodels).toEqual([])
        expect(latest.current?.catalogLoading).toBe(true)
    })

    it('clears the metamodels and stops loading on sign-out', async () => {
        vi.mocked(listKnowledgeMetamodels).mockResolvedValue([])
        vi.mocked(syncUserSession).mockResolvedValue(profile(['amalthea']))
        auth.user = { username: 'alice' } as AuthUser

        const { latest, rerender } = renderProvider()
        await act(async () => {})

        auth.user = null
        rerender()

        expect(latest.current?.knownMetamodels).toEqual([])
        expect(latest.current?.catalogLoading).toBe(false)
    })
})
