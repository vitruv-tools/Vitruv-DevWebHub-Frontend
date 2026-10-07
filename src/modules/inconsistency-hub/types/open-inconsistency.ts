import type { UserInteractionPayload } from '../../model-editor/types/api-propagation-task.ts'

export type OpenInconsistencyState = 'OPEN' | 'RESOLVED' | 'FAILED'

export type InconsistencyListFilter = OpenInconsistencyState | 'ALL'

export type OpenInconsistency = {
    id: string
    vsumId: string
    taskId: string
    viewId: string
    vsumName?: string | null
    metamodelName?: string | null
    title: string
    message?: string | null
    interaction?: UserInteractionPayload | Record<string, unknown> | null
    state: OpenInconsistencyState
    createdAt?: string
    resolvedAt?: string | null
    resolvedBy?: string | null
    resolutionChoice?: string | null
    resolutionComment?: string | null
    /** Individual packages involved, such as amalthea and ascet. */
    involvedMetamodels?: string[] | null
}

export type InconsistencyComment = {
    id: string
    inconsistencyId: string
    author: string
    body: string
    createdAt?: string
}

export type ViewUpdateSummary = {
    id: string
    vsumId?: string | null
    viewTypeName?: string | null
    selectedObjectEClassNames?: string[]
    timestamp?: string | null
    resourceSetLength: number
}

export type ModelElementNode = {
    id: string
    displayName: string
    eClassName: string
    metamodelName: string
    uri: string
    role: string
    parentId?: string | null
}

export type CorrespondenceEdge = {
    sourceId: string
    targetId: string
    sourceLabel: string
    targetLabel: string
}

export type InconsistencyContext = {
    inconsistencyId: string
    vsumId: string
    vsumName?: string | null
    metamodelName?: string | null
    viewTypeName?: string | null
    note?: string | null
    elements: ModelElementNode[]
    correspondences: CorrespondenceEdge[]
}

export type InconsistencyModelSnapshot = {
    inconsistencyId: string
    vsumId: string
    vsumName?: string | null
    metamodelName?: string | null
    viewTypeName?: string | null
    snapshotTimestamp?: string | null
    note?: string | null
    encodedResourceSet: string
}
