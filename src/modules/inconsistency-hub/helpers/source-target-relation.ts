/**
 * Human-readable source → target pair for a VSUM metamodel (parked change originates in source,
 * consistency reaction targets the other side).
 */
export type SourceTargetRelation = {
    source: string
    target: string
}

const METAMODEL_RELATIONS: Record<string, SourceTargetRelation> = {
    AmaltheaAscet: { source: 'Amalthea', target: 'Ascet' },
    SystemRootVsum: { source: 'System', target: 'Root' },
}

export function resolveSourceTargetRelation(
    metamodelName?: string | null,
): SourceTargetRelation | null {
    if (!metamodelName) {
        return null
    }
    return METAMODEL_RELATIONS[metamodelName] ?? null
}

/** e.g. "Amalthea → Ascet" */
export function formatSourceTargetRelation(metamodelName?: string | null): string | null {
    const pair = resolveSourceTargetRelation(metamodelName)
    if (!pair) {
        return null
    }
    return `${pair.source} → ${pair.target}`
}
