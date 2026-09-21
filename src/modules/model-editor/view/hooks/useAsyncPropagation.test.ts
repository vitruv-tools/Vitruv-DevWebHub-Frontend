import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { VitruviusClient } from '../../infra/vitruvius-client.ts'
import { buildInteractionResponse } from '../../helpers/build-interaction-response.ts'
import { useAsyncPropagation } from './useAsyncPropagation.ts'

const confirmationInteraction = {
    eClass: 'http://vitruv.tools/change/interaction#//ConfirmationUserInteraction',
    message: 'Proceed with propagation?',
}

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
}

describe('useAsyncPropagation', () => {
    it('polls until WAITING_USER_INTERACTION, submits response, then completes', async () => {
        const viewId = 'view-1'
        const taskId = 'task-abc'
        const resultPayload = [{ uri: '/example.model' }]
        let pollCount = 0

        const request = vi.fn(async (path: string, init?: RequestInit) => {
            if (path === `/v1/views/${viewId}/apply-update/async` && init?.method === 'POST') {
                expect(init.body).toBe(JSON.stringify([{ uri: '/example.model' }]))
                return jsonResponse({ taskId })
            }

            if (path === `/v1/tasks/${taskId}` && (!init || init.method === undefined)) {
                pollCount += 1
                if (pollCount === 1) {
                    return jsonResponse({
                        taskId,
                        viewId,
                        state: 'RUNNING',
                    })
                }
                if (pollCount === 2) {
                    return jsonResponse({
                        taskId,
                        viewId,
                        state: 'WAITING_USER_INTERACTION',
                        interaction: confirmationInteraction,
                    })
                }
                return jsonResponse({
                    taskId,
                    viewId,
                    state: 'COMPLETED',
                    result: JSON.stringify(resultPayload),
                })
            }

            if (path === `/v1/tasks/${taskId}/interaction` && init?.method === 'POST') {
                expect(init.body).toBe(buildInteractionResponse(confirmationInteraction, true))
                return new Response(null, { status: 204 })
            }

            throw new Error(`Unexpected request: ${path} ${init?.method ?? 'GET'}`)
        })

        const client = { request } as unknown as VitruviusClient
        const { result } = renderHook(() => useAsyncPropagation(client))

        let applyPromise: Promise<unknown>
        act(() => {
            applyPromise = result.current.applyUpdateAsync(viewId, [{ uri: '/example.model' }])
        })

        await waitFor(() => {
            expect(result.current.uiState.phase).toBe('interaction')
            expect(result.current.uiState.interaction).toEqual(confirmationInteraction)
        })

        act(() => {
            result.current.submitInteractionResponse(
                buildInteractionResponse(confirmationInteraction, true),
            )
        })

        await expect(applyPromise!).resolves.toEqual(resultPayload)
        expect(request).toHaveBeenCalledWith(
            `/v1/tasks/${taskId}/interaction`,
            expect.objectContaining({ method: 'POST' }),
        )

        await waitFor(() => {
            expect(result.current.uiState).toEqual({ isActive: false, phase: 'idle' })
        })
    })

    it('defers interaction without posting a response and keeps the task id', async () => {
        const viewId = 'view-1'
        const taskId = 'task-abc'
        const inconsistencyId = 'inc-1'

        const request = vi.fn(async (path: string, init?: RequestInit) => {
            if (path === `/v1/views/${viewId}/apply-update/async` && init?.method === 'POST') {
                return jsonResponse({ taskId })
            }

            if (path === `/v1/tasks/${taskId}` && (!init || init.method === undefined)) {
                return jsonResponse({
                    taskId,
                    viewId,
                    state: 'WAITING_USER_INTERACTION',
                    interaction: confirmationInteraction,
                })
            }

            if (path === `/v1/tasks/${taskId}/inconsistent` && init?.method === 'POST') {
                return jsonResponse({
                    id: inconsistencyId,
                    taskId,
                    viewId,
                    state: 'OPEN',
                    title: 'Proceed?',
                })
            }

            throw new Error(`Unexpected request: ${path} ${init?.method ?? 'GET'}`)
        })

        const client = { request } as unknown as VitruviusClient
        const { result } = renderHook(() => useAsyncPropagation(client))

        let applyPromise: Promise<unknown>
        act(() => {
            applyPromise = result.current.applyUpdateAsync(viewId, [{ uri: '/example.model' }])
        })

        await waitFor(() => {
            expect(result.current.uiState.phase).toBe('interaction')
        })

        const applyRejected = expect(applyPromise!).rejects.toMatchObject({
            name: 'PropagationDeferredError',
            taskId,
            viewId,
        })

        let deferred
        await act(async () => {
            deferred = await result.current.deferPendingPropagation()
        })

        expect(deferred).toEqual({
            taskId,
            viewId,
            inconsistencyId,
            interaction: confirmationInteraction,
        })
        await applyRejected
        expect(request).toHaveBeenCalledWith(
            `/v1/tasks/${taskId}/inconsistent`,
            expect.objectContaining({ method: 'POST' }),
        )
        expect(request).not.toHaveBeenCalledWith(
            `/v1/tasks/${taskId}/interaction`,
            expect.anything(),
        )
    })
})
