import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { VitruviusClient } from '../../../../model-editor/infra/vitruvius-client.ts'
import type { ViewUpdateSummary } from '../../../types/open-inconsistency.ts'
import { listInconsistencyViewUpdates } from '../../../api/inconsistency-api.ts'
import { CommitsTab } from './CommitsTab.tsx'

vi.mock('../../../api/inconsistency-api.ts', () => ({
    listInconsistencyViewUpdates: vi.fn(),
}))

const client = {} as VitruviusClient

function update(id: string, viewTypeName: string): ViewUpdateSummary {
    return { id, viewTypeName, resourceSetLength: 42 }
}

function deferred<T>() {
    let resolve!: (value: T) => void
    const promise = new Promise<T>((res) => {
        resolve = res
    })
    return { promise, resolve }
}

describe('CommitsTab', () => {
    afterEach(() => {
        vi.resetAllMocks()
    })

    it('shows a loading state, then the view updates', async () => {
        vi.mocked(listInconsistencyViewUpdates).mockResolvedValue([update('u1', 'TreeView')])

        render(<CommitsTab client={client} inconsistencyId="inc-1" />)

        expect(screen.getByText('Loading…')).toBeTruthy()
        expect(await screen.findByText('TreeView')).toBeTruthy()
        expect(screen.queryByText('Loading…')).toBeNull()
        expect(listInconsistencyViewUpdates).toHaveBeenCalledWith(client, 'inc-1')
    })

    it('shows the error when loading fails', async () => {
        vi.mocked(listInconsistencyViewUpdates).mockRejectedValue(new Error('Not found'))

        render(<CommitsTab client={client} inconsistencyId="inc-1" />)

        expect(await screen.findByText('Not found')).toBeTruthy()
        expect(screen.queryByText('Loading…')).toBeNull()
    })

    it('clears the previous error, shows loading and ignores stale responses on change', async () => {
        const first = deferred<ViewUpdateSummary[]>()
        const second = deferred<ViewUpdateSummary[]>()
        vi.mocked(listInconsistencyViewUpdates)
            .mockRejectedValueOnce(new Error('Not found'))
            .mockReturnValueOnce(first.promise)
            .mockReturnValueOnce(second.promise)

        const { rerender } = render(<CommitsTab client={client} inconsistencyId="inc-1" />)
        expect(await screen.findByText('Not found')).toBeTruthy()

        rerender(<CommitsTab client={client} inconsistencyId="inc-2" />)
        expect(screen.queryByText('Not found')).toBeNull()
        expect(screen.getByText('Loading…')).toBeTruthy()

        rerender(<CommitsTab client={client} inconsistencyId="inc-3" />)
        await act(async () => {
            second.resolve([update('u3', 'Update for inc-3')])
        })
        await act(async () => {
            first.resolve([update('u2', 'Stale update for inc-2')])
        })

        expect(screen.getByText('Update for inc-3')).toBeTruthy()
        expect(screen.queryByText('Stale update for inc-2')).toBeNull()
    })
})
