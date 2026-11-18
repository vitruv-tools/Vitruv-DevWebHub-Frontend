import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { VitruviusClient } from '../../../../model-editor/infra/vitruvius-client.ts'
import type { OpenInconsistency } from '../../../types/open-inconsistency.ts'
import {
    getInconsistencyContext,
    getInconsistencyModelSnapshot,
} from '../../../api/inconsistency-api.ts'
import { FilesChangedTab } from './FilesChangedTab.tsx'

vi.mock('../../../api/inconsistency-api.ts', () => ({
    getInconsistencyContext: vi.fn(),
    getInconsistencyModelSnapshot: vi.fn(),
}))

type Snapshot = Awaited<ReturnType<typeof getInconsistencyModelSnapshot>>

const client = {} as VitruviusClient

function inconsistency(id: string): OpenInconsistency {
    return {
        id,
        title: `Issue ${id}`,
        vsumId: 'vsum',
        taskId: 'task',
        viewId: 'view',
        state: 'OPEN',
    }
}

function deferred<T>() {
    let resolve!: (value: T) => void
    let reject!: (error: unknown) => void
    const promise = new Promise<T>((res, rej) => {
        resolve = res
        reject = rej
    })
    return { promise, resolve, reject }
}

describe('FilesChangedTab', () => {
    beforeEach(() => {
        vi.mocked(getInconsistencyContext).mockReturnValue(new Promise(() => {}))
    })

    afterEach(() => {
        vi.resetAllMocks()
    })

    it('shows a loading state, then the error when the snapshot has no metamodel', async () => {
        vi.mocked(getInconsistencyModelSnapshot).mockResolvedValue({} as Snapshot)

        render(<FilesChangedTab inconsistency={inconsistency('a')} client={client} />)

        expect(screen.getByText('Loading model snapshot…')).toBeTruthy()
        expect(
            await screen.findByText('VSUM metamodel name is missing on the snapshot'),
        ).toBeTruthy()
    })

    it('shows loading again and ignores the stale snapshot when the inconsistency changes', async () => {
        const first = deferred<Snapshot>()
        const second = deferred<Snapshot>()
        vi.mocked(getInconsistencyModelSnapshot)
            .mockReturnValueOnce(first.promise)
            .mockReturnValueOnce(second.promise)

        const { rerender } = render(
            <FilesChangedTab inconsistency={inconsistency('a')} client={client} />,
        )
        rerender(<FilesChangedTab inconsistency={inconsistency('b')} client={client} />)
        expect(screen.getByText('Loading model snapshot…')).toBeTruthy()

        await act(async () => second.reject(new Error('Snapshot b failed')))
        await act(async () => first.reject(new Error('Snapshot a failed')))

        expect(screen.getByText('Snapshot b failed')).toBeTruthy()
        expect(screen.queryByText('Snapshot a failed')).toBeNull()
        expect(getInconsistencyModelSnapshot).toHaveBeenLastCalledWith(client, 'b')
    })
})
