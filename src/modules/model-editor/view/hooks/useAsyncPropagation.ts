import { useCallback, useRef, useState } from 'react'
import type { VitruviusClient } from '../../infra/vitruvius-client.ts'
import type {
    DeferredPropagation,
    PropagationTaskStatus,
    PropagationUiState,
    UserInteractionPayload,
} from '../../types/api-propagation-task.ts'
import { isPropagationDeferredError, PropagationDeferredError } from '../../types/api-propagation-task.ts'

const POLL_INTERVAL_MS = 500
const MAX_POLL_ATTEMPTS = 120

const IDLE_STATE: PropagationUiState = { isActive: false, phase: 'idle' }

/**
 * Runs async change propagation: start task → poll status → handle user interactions → return resource set.
 */
export function useAsyncPropagation(client: VitruviusClient) {
    const [uiState, setUiState] = useState<PropagationUiState>(IDLE_STATE)
    const interactionResolverRef = useRef<((responseJson: string) => void) | null>(null)
    const interactionRejecterRef = useRef<((error: Error) => void) | null>(null)
    const activeTaskRef = useRef<{ taskId: string, viewId: string } | null>(null)
    const pendingInteractionRef = useRef<UserInteractionPayload | undefined>(undefined)

    async function startAsyncUpdate(viewId: string, resourceSet?: unknown): Promise<string> {
        const response = await client.request(`/v1/views/${viewId}/apply-update/async`, {
            method: 'POST',
            ...(resourceSet !== undefined
                ? {
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(resourceSet),
                }
                : {}),
        })
        const body: { taskId: string } = await response.json()
        return body.taskId
    }

    async function getTaskStatus(taskId: string): Promise<PropagationTaskStatus> {
        const response = await client.request(`/v1/tasks/${taskId}`)
        return response.json()
    }

    async function submitTaskInteraction(taskId: string, interactionJson: string): Promise<void> {
        await client.request(`/v1/tasks/${taskId}/interaction`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: interactionJson,
        })
    }

    function waitForInteraction(
        taskId: string,
        viewId: string,
        interaction: UserInteractionPayload,
    ): Promise<string> {
        pendingInteractionRef.current = interaction
        return new Promise((resolve, reject) => {
            interactionResolverRef.current = resolve
            interactionRejecterRef.current = reject
            setUiState({
                isActive: true,
                phase: 'interaction',
                interaction,
                taskId,
                viewId,
            })
        })
    }

    const submitInteractionResponse = useCallback((responseJson: string) => {
        interactionResolverRef.current?.(responseJson)
        interactionResolverRef.current = null
        interactionRejecterRef.current = null
        pendingInteractionRef.current = undefined
        const active = activeTaskRef.current
        setUiState({
            isActive: true,
            phase: 'running',
            statusMessage: 'Resuming propagation…',
            taskId: active?.taskId,
            viewId: active?.viewId,
        })
    }, [])

    const deferPendingPropagation = useCallback(async (): Promise<DeferredPropagation | null> => {
        const active = activeTaskRef.current
        if (active == null) {
            return null
        }

        const response = await client.request(`/v1/tasks/${active.taskId}/inconsistent`, { method: 'POST' })
        const body = await response.json() as { id?: string }

        const snapshot: DeferredPropagation = {
            taskId: active.taskId,
            viewId: active.viewId,
            inconsistencyId: body.id,
            interaction: pendingInteractionRef.current,
        }

        const reject = interactionRejecterRef.current
        interactionResolverRef.current = null
        interactionRejecterRef.current = null
        pendingInteractionRef.current = undefined
        setUiState(IDLE_STATE)
        const deferredError = new PropagationDeferredError(snapshot.taskId, snapshot.viewId)
        queueMicrotask(() => reject?.(deferredError))
        return snapshot
    }, [client])

    async function pollUntilComplete(taskId: string): Promise<any[]> {
        for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
            const status = await getTaskStatus(taskId)

            if (status.state === 'COMPLETED') {
                if (!status.result) {
                    throw new Error('Propagation completed without a result')
                }
                return JSON.parse(status.result)
            }

            if (status.state === 'FAILED') {
                throw new Error(status.error ?? 'Change propagation failed')
            }

            if (status.state === 'INCONSISTENT') {
                throw new PropagationDeferredError(taskId, status.viewId)
            }

            if (status.state === 'WAITING_USER_INTERACTION') {
                if (status.interaction) {
                    const responseJson = await waitForInteraction(taskId, status.viewId, status.interaction)
                    await submitTaskInteraction(taskId, responseJson)
                    continue
                }

                setUiState({
                    isActive: true,
                    phase: 'running',
                    statusMessage: 'Waiting for interaction prompt…',
                })
                await sleep(POLL_INTERVAL_MS)
                continue
            }

            setUiState({
                isActive: true,
                phase: 'running',
                statusMessage: `Propagating changes… (${status.state})`,
            })

            await sleep(POLL_INTERVAL_MS)
        }

        throw new Error('Propagation timed out while waiting for completion')
    }

    async function applyUpdateAsync(viewId: string, resourceSet?: unknown): Promise<any[]> {
        setUiState({ isActive: true, phase: 'running', statusMessage: 'Starting propagation…', viewId })
        try {
            const taskId = await startAsyncUpdate(viewId, resourceSet)
            activeTaskRef.current = { taskId, viewId }
            return await pollUntilComplete(taskId)
        } catch (error) {
            if (isPropagationDeferredError(error)) {
                throw error
            }
            throw error
        } finally {
            activeTaskRef.current = null
            pendingInteractionRef.current = undefined
            interactionResolverRef.current = null
            interactionRejecterRef.current = null
            setUiState(IDLE_STATE)
        }
    }

    return {
        uiState,
        applyUpdateAsync,
        submitInteractionResponse,
        deferPendingPropagation,
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}
