import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { VitruviusClient } from '../../../../model-editor/infra/vitruvius-client.ts'
import type { InconsistencyComment } from '../../../types/open-inconsistency.ts'
import {
    addInconsistencyComment,
    listInconsistencyComments,
} from '../../../api/inconsistency-api.ts'
import { CommentsTab } from './CommentsTab.tsx'

vi.mock('../../../api/inconsistency-api.ts', () => ({
    listInconsistencyComments: vi.fn(),
    addInconsistencyComment: vi.fn(),
}))

const client = {} as VitruviusClient

function comment(id: string, body: string): InconsistencyComment {
    return { id, inconsistencyId: 'inc', author: 'Alice', body }
}

function deferred<T>() {
    let resolve!: (value: T) => void
    const promise = new Promise<T>((res) => {
        resolve = res
    })
    return { promise, resolve }
}

describe('CommentsTab', () => {
    afterEach(() => {
        vi.resetAllMocks()
    })

    it('shows a loading state, then the loaded comments', async () => {
        vi.mocked(listInconsistencyComments).mockResolvedValue([comment('c1', 'First comment')])

        render(<CommentsTab client={client} inconsistencyId="inc-1" authorLabel="Bob" />)

        expect(screen.getByText('Loading comments…')).toBeTruthy()
        expect(await screen.findByText('First comment')).toBeTruthy()
        expect(screen.queryByText('Loading comments…')).toBeNull()
        expect(listInconsistencyComments).toHaveBeenCalledWith(client, 'inc-1')
    })

    it('shows the error when loading fails', async () => {
        vi.mocked(listInconsistencyComments).mockRejectedValue(new Error('Server down'))

        render(<CommentsTab client={client} inconsistencyId="inc-1" authorLabel="Bob" />)

        expect(await screen.findByText('Server down')).toBeTruthy()
        expect(screen.queryByText('Loading comments…')).toBeNull()
    })

    it('shows loading again and ignores the stale response when the inconsistency changes', async () => {
        const first = deferred<InconsistencyComment[]>()
        const second = deferred<InconsistencyComment[]>()
        vi.mocked(listInconsistencyComments)
            .mockReturnValueOnce(first.promise)
            .mockReturnValueOnce(second.promise)

        const { rerender } = render(
            <CommentsTab client={client} inconsistencyId="inc-1" authorLabel="Bob" />,
        )
        rerender(<CommentsTab client={client} inconsistencyId="inc-2" authorLabel="Bob" />)
        expect(screen.getByText('Loading comments…')).toBeTruthy()

        await act(async () => {
            second.resolve([comment('c2', 'Comment for inc-2')])
        })
        await act(async () => {
            first.resolve([comment('c1', 'Stale comment for inc-1')])
        })

        expect(screen.getByText('Comment for inc-2')).toBeTruthy()
        expect(screen.queryByText('Stale comment for inc-1')).toBeNull()
        expect(screen.queryByText('Loading comments…')).toBeNull()
    })

    it('posts a comment and reloads the list', async () => {
        vi.mocked(listInconsistencyComments)
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([comment('c1', 'New comment')])
        vi.mocked(addInconsistencyComment).mockResolvedValue(comment('c1', 'New comment'))

        render(<CommentsTab client={client} inconsistencyId="inc-1" authorLabel="Bob" />)
        await waitFor(() => expect(screen.queryByText('Loading comments…')).toBeNull())

        fireEvent.change(screen.getByPlaceholderText('Leave a comment'), {
            target: { value: '  New comment  ' },
        })
        fireEvent.click(screen.getByRole('button', { name: 'Comment' }))

        expect(await screen.findByText('New comment')).toBeTruthy()
        expect(addInconsistencyComment).toHaveBeenCalledWith(client, 'inc-1', {
            author: 'Bob',
            body: 'New comment',
        })
        expect(listInconsistencyComments).toHaveBeenCalledTimes(2)
    })

    it('ignores the reload after posting once another inconsistency is shown', async () => {
        const reloadAfterPost = deferred<InconsistencyComment[]>()
        const otherInconsistency = deferred<InconsistencyComment[]>()
        vi.mocked(listInconsistencyComments)
            .mockResolvedValueOnce([])
            .mockReturnValueOnce(reloadAfterPost.promise)
            .mockReturnValueOnce(otherInconsistency.promise)
        vi.mocked(addInconsistencyComment).mockResolvedValue(comment('c1', 'Posted on inc-1'))

        const { rerender } = render(
            <CommentsTab client={client} inconsistencyId="inc-1" authorLabel="Bob" />,
        )
        await waitFor(() => expect(screen.queryByText('Loading comments…')).toBeNull())
        fireEvent.change(screen.getByPlaceholderText('Leave a comment'), {
            target: { value: 'Posted on inc-1' },
        })
        fireEvent.click(screen.getByRole('button', { name: 'Comment' }))
        await waitFor(() => expect(listInconsistencyComments).toHaveBeenCalledTimes(2))

        rerender(<CommentsTab client={client} inconsistencyId="inc-2" authorLabel="Bob" />)
        await act(async () => {
            otherInconsistency.resolve([comment('c2', 'Comment for inc-2')])
        })
        await act(async () => {
            reloadAfterPost.resolve([comment('c1', 'Posted on inc-1')])
        })

        expect(screen.getByText('Comment for inc-2')).toBeTruthy()
        expect(screen.queryByText('Posted on inc-1')).toBeNull()
        expect(screen.queryByText('Loading comments…')).toBeNull()
    })
})
