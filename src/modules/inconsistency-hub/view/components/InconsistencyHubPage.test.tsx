import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { OpenInconsistency } from '../../types/open-inconsistency.ts'
import { listInconsistencies } from '../../api/inconsistency-api.ts'
import { InconsistencyHubPage } from './InconsistencyHubPage.tsx'

const notify = vi.fn()
const knowledge = { knownMetamodels: [] as string[], openSettings: vi.fn() }

vi.mock('../../../../common/systems/notification/useNotify.ts', () => ({
    useNotify: () => notify,
}))
vi.mock('../../../auth/context/useAuth.ts', () => ({
    useAuth: () => ({ user: { username: 'bob', name: 'Bob' }, signOut: vi.fn() }),
}))
vi.mock('../../../users/context/useModelKnowledge.ts', () => ({
    useModelKnowledge: () => knowledge,
}))
vi.mock('../../../model-editor/infra/vitruvius-client-impl.ts', () => ({
    VitruviusClientImpl: class {},
}))
vi.mock('../../api/inconsistency-api.ts', () => ({
    listInconsistencies: vi.fn(),
    getTaskStatus: vi.fn(),
    interactionKey: vi.fn(),
    pollUntilCompleteOrNextInteraction: vi.fn(),
    recordInconsistencyResolution: vi.fn(),
    submitTaskInteraction: vi.fn(),
}))
vi.mock('./tabs/CommentsTab.tsx', () => ({ CommentsTab: () => <div>comments tab</div> }))
vi.mock('./tabs/CommitsTab.tsx', () => ({ CommitsTab: () => <div>commits tab</div> }))
vi.mock('./tabs/FilesChangedTab.tsx', () => ({ FilesChangedTab: () => <div>files tab</div> }))

function inconsistency(id: string, title: string, extra: Partial<OpenInconsistency> = {}) {
    return {
        id,
        title,
        vsumId: 'vsum',
        taskId: `task-${id}`,
        viewId: 'view',
        state: 'RESOLVED',
        ...extra,
    } satisfies OpenInconsistency
}

function deferred<T>() {
    let resolve!: (value: T) => void
    const promise = new Promise<T>((res) => {
        resolve = res
    })
    return { promise, resolve }
}

function renderPage() {
    return render(<InconsistencyHubPage onBack={vi.fn()} />)
}

describe('InconsistencyHubPage', () => {
    beforeEach(() => {
        knowledge.knownMetamodels = []
    })

    afterEach(() => {
        vi.mocked(listInconsistencies).mockReset()
        notify.mockReset()
    })

    it('shows loading, then the open inconsistencies', async () => {
        vi.mocked(listInconsistencies).mockResolvedValue([inconsistency('a1', 'Missing entity')])

        renderPage()

        expect(screen.getByText('Loading…')).toBeTruthy()
        expect(await screen.findByText('Missing entity')).toBeTruthy()
        expect(screen.queryByText('Loading…')).toBeNull()
        expect(vi.mocked(listInconsistencies).mock.calls[0][1]).toBe('OPEN')
    })

    it('notifies about a failed load and stops loading', async () => {
        vi.mocked(listInconsistencies).mockRejectedValue(new Error('Server down'))

        renderPage()

        await vi.waitFor(() => expect(notify).toHaveBeenCalledWith('Server down', 'error'))
        expect(screen.queryByText('Loading…')).toBeNull()
        expect(screen.getByText('No inconsistencies for this filter.')).toBeTruthy()
    })

    it('shows loading when the filter changes and ignores the stale response', async () => {
        const open = deferred<OpenInconsistency[]>()
        const resolved = deferred<OpenInconsistency[]>()
        vi.mocked(listInconsistencies).mockImplementation((_client, filter) =>
            filter === 'OPEN' ? open.promise : resolved.promise,
        )

        renderPage()
        fireEvent.click(screen.getByText('Resolved'))
        expect(screen.getByText('Loading…')).toBeTruthy()

        await act(async () => {
            resolved.resolve([inconsistency('r1', 'Resolved one')])
        })
        await act(async () => {
            open.resolve([inconsistency('o1', 'Stale open one', { state: 'OPEN' })])
        })

        expect(screen.getByText('Resolved one')).toBeTruthy()
        expect(screen.queryByText('Stale open one')).toBeNull()
        expect(screen.queryByText('Loading…')).toBeNull()
    })

    it('reloads the list when refresh is clicked', async () => {
        vi.mocked(listInconsistencies)
            .mockResolvedValueOnce([inconsistency('a1', 'First version')])
            .mockResolvedValueOnce([inconsistency('a1', 'Second version')])

        renderPage()
        expect(await screen.findByText('First version')).toBeTruthy()

        fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))

        expect(await screen.findByText('Second version')).toBeTruthy()
        expect(listInconsistencies).toHaveBeenCalledTimes(2)
    })

    it('drops the selection once it is no longer visible', async () => {
        vi.mocked(listInconsistencies).mockResolvedValue([
            inconsistency('a1b2', 'Amalthea issue', { involvedMetamodels: ['amalthea'] }),
            inconsistency('c3d4', 'Ascet issue', { involvedMetamodels: ['ascet'] }),
        ])
        const { rerender } = renderPage()

        fireEvent.click(screen.getByText('Relevant to me'))
        fireEvent.click(await screen.findByText('Amalthea issue'))
        expect(screen.getByText('Amalthea issue#a1b2')).toBeTruthy()

        knowledge.knownMetamodels = ['ascet']
        rerender(<InconsistencyHubPage onBack={vi.fn()} />)

        expect(screen.queryByText('Amalthea issue')).toBeNull()
        expect(screen.queryByText('Amalthea issue#a1b2')).toBeNull()
        expect(screen.getByText('Ascet issue')).toBeTruthy()
    })
})
