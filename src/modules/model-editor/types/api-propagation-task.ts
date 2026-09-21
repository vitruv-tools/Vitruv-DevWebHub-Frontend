export type AsyncTaskState =
    | 'RUNNING'
    | 'WAITING_USER_INTERACTION'
    | 'COMPLETED'
    | 'FAILED'
    | 'INCONSISTENT'

export type PropagationTaskStatus = {
    taskId: string
    viewId: string
    state: AsyncTaskState
    createdAt?: string
    completedAt?: string
    error?: string | null
    interaction?: UserInteractionPayload | null
    result?: string | null
}

/** Vitruv user interaction as returned by GET /v1/tasks/{taskId} (EMF JSON). */
export type UserInteractionPayload = {
    eClass: string
    message?: string
    choices?: string[]
    confirmed?: boolean
    text?: string
    selectedIndex?: number
    selectedIndices?: number[]
    /** Present when the server rejected free-text input via InputValidator; user may retry. */
    validationError?: string
}

export type PropagationUiPhase = 'idle' | 'running' | 'interaction'

export type PropagationUiState = {
    isActive: boolean
    phase: PropagationUiPhase
    interaction?: UserInteractionPayload
    statusMessage?: string
    taskId?: string
    viewId?: string
}

export type DeferredPropagation = {
    taskId: string
    viewId: string
    inconsistencyId?: string
    interaction?: UserInteractionPayload
}

export class PropagationDeferredError extends Error {
    readonly taskId: string
    readonly viewId: string

    constructor(taskId: string, viewId: string) {
        super('Propagation deferred; task kept for a pending inconsistency')
        this.name = 'PropagationDeferredError'
        this.taskId = taskId
        this.viewId = viewId
    }
}

export function isPropagationDeferredError(error: unknown): error is PropagationDeferredError {
    return error instanceof PropagationDeferredError
}
