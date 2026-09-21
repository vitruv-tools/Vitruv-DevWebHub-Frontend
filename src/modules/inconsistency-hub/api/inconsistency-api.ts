import type { VitruviusClient } from '../../model-editor/infra/vitruvius-client.ts'
import type {
    PropagationTaskStatus,
    UserInteractionPayload,
} from '../../model-editor/types/api-propagation-task.ts'
import type {
    InconsistencyComment,
    InconsistencyContext,
    InconsistencyListFilter,
    InconsistencyModelSnapshot,
    OpenInconsistency,
    ViewUpdateSummary,
} from '../types/open-inconsistency.ts'

const POLL_INTERVAL_MS = 500
const MAX_POLL_ATTEMPTS = 120

export async function listInconsistencies(
    client: VitruviusClient,
    state: InconsistencyListFilter = 'OPEN',
): Promise<OpenInconsistency[]> {
    const query = state === 'OPEN' ? '' : `?state=${encodeURIComponent(state)}`
    const response = await client.request(`/v1/inconsistencies${query}`)
    return response.json()
}

/** @deprecated Prefer listInconsistencies(client, 'OPEN') */
export async function listOpenInconsistencies(client: VitruviusClient): Promise<OpenInconsistency[]> {
    return listInconsistencies(client, 'OPEN')
}

export async function getOpenInconsistency(client: VitruviusClient, id: string): Promise<OpenInconsistency> {
    const response = await client.request(`/v1/inconsistencies/${id}`)
    return response.json()
}

export async function listInconsistencyComments(
    client: VitruviusClient,
    id: string,
): Promise<InconsistencyComment[]> {
    const response = await client.request(`/v1/inconsistencies/${id}/comments`)
    return response.json()
}

export async function addInconsistencyComment(
    client: VitruviusClient,
    id: string,
    body: { author?: string, body: string },
): Promise<InconsistencyComment> {
    const response = await client.request(`/v1/inconsistencies/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })
    return response.json()
}

export async function recordInconsistencyResolution(
    client: VitruviusClient,
    id: string,
    body: { resolvedBy: string, choice: string, comment?: string },
): Promise<OpenInconsistency> {
    const response = await client.request(`/v1/inconsistencies/${id}/resolution`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })
    if (!response.ok) {
        const text = await response.text()
        throw new Error(text || `Failed to record resolution (${response.status})`)
    }
    return response.json()
}

export async function listInconsistencyViewUpdates(
    client: VitruviusClient,
    id: string,
): Promise<ViewUpdateSummary[]> {
    const response = await client.request(`/v1/inconsistencies/${id}/view-updates`)
    return response.json()
}

export async function getInconsistencyContext(
    client: VitruviusClient,
    id: string,
): Promise<InconsistencyContext> {
    const response = await client.request(`/v1/inconsistencies/${id}/context`)
    return response.json()
}

export async function getInconsistencyModelSnapshot(
    client: VitruviusClient,
    id: string,
): Promise<InconsistencyModelSnapshot> {
    const response = await client.request(`/v1/inconsistencies/${id}/model`)
    if (!response.ok) {
        const text = await response.text()
        throw new Error(text || `Failed to load model snapshot (${response.status})`)
    }
    return response.json()
}

export async function getTaskStatus(client: VitruviusClient, taskId: string): Promise<PropagationTaskStatus> {
    const response = await client.request(`/v1/tasks/${taskId}`)
    return response.json()
}

export async function submitTaskInteraction(
    client: VitruviusClient,
    taskId: string,
    interactionJson: string,
): Promise<void> {
    await client.request(`/v1/tasks/${taskId}/interaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: interactionJson,
    })
}

export function interactionKey(interaction?: UserInteractionPayload | null): string {
    if (!interaction) {
        return ''
    }
    const choices = interaction.choices?.join('\u0001') ?? ''
    return `${interaction.eClass}\u0000${interaction.message ?? ''}\u0000${choices}`
}

/**
 * After an interaction was submitted, poll until the task completes, fails, or needs another
 * (different) answer. Ignores the prompt that was just answered until the worker moves on.
 */
export async function pollUntilCompleteOrNextInteraction(
    client: VitruviusClient,
    taskId: string,
    options?: {
        onProgress?: (message: string) => void
        answeredInteractionKey?: string
    },
): Promise<PropagationTaskStatus> {
    const answeredKey = options?.answeredInteractionKey ?? ''
    const onProgress = options?.onProgress

    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
        const status = await getTaskStatus(client, taskId)

        if (
            status.state === 'COMPLETED'
            || status.state === 'FAILED'
            || status.state === 'INCONSISTENT'
        ) {
            return status
        }

        if (status.state === 'WAITING_USER_INTERACTION') {
            if (status.interaction) {
                const nextKey = interactionKey(status.interaction)
                // Same prompt still visible while the worker consumes the answer — keep polling.
                if (answeredKey && nextKey === answeredKey && !status.interaction.validationError) {
                    onProgress?.('Resuming propagation…')
                    await sleep(POLL_INTERVAL_MS)
                    continue
                }
                return status
            }
            onProgress?.('Waiting for next interaction prompt…')
            await sleep(POLL_INTERVAL_MS)
            continue
        }

        onProgress?.(`Propagating changes… (${status.state})`)
        await sleep(POLL_INTERVAL_MS)
    }
    throw new Error('Timed out waiting for propagation to finish')
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}
