import type { StructuredResource } from '../../model-editor/types/structured-resource.ts'
import { getAllStructuredResources } from '../../model-editor/helpers/structured-resource-helpers.ts'
import type { ModelElementNode, OpenInconsistency } from '../types/open-inconsistency.ts'

export type InconsistencyHighlight = {
    /** Primary element for tree highlight (first of {@link rootResourceIds}). */
    rootResourceId: string | null
    /** Elements that should get the red inconsistency ring (diagram). */
    rootResourceIds: string[]
}

/** Quoted name after a type-ish word: entity 'X', task "Y", … */
const NAMED_ELEMENT_PATTERN = /(?:entity|component|task|link|module)\s+['"]([^'"]+)['"]/i

/** Types that are containers / packages — prefer more specific leaf types when both match. */
const LOW_PRIORITY_TYPES = new Set([
    'Root',
    'System',
    'ComponentContainer',
    'AscetModule',
])

/**
 * Derives the inconsistency diagram root from the parked message and model snapshot.
 * Works for SystemRoot, AmaltheaAscet, and other VSUMs by matching message text to element types/names.
 */
export function resolveInconsistencyHighlight(
    structuredResources: StructuredResource[],
    inconsistency: OpenInconsistency,
): InconsistencyHighlight {
    const all = getAllStructuredResources(structuredResources)
    if (all.length === 0) {
        return toHighlight([])
    }

    const message = inconsistency.message ?? inconsistency.title ?? ''
    const quotedName = extractQuotedEntityName(message)

    const byName = findByQuotedName(all, message)
    if (byName) {
        return toHighlight([byName.id])
    }

    if (quotedName) {
        // Message names a specific element that is not in the snapshot — never guess another one.
        return toHighlight([])
    }

    // entity 'null' / blank names: highlight unnamed Entities (all if several — we cannot tell which).
    if (messageMentionsNullEntity(message)) {
        const unnamed = all.filter(
            resource => resource.type.name === 'Entity' && !resourceName(resource),
        )
        if (unnamed.length > 0) {
            return toHighlight(unnamed.map(resource => resource.id))
        }
    }

    const roots = findAffectedResources(all, message)
    return toHighlight(roots.map(resource => resource.id))
}

function toHighlight(ids: string[]): InconsistencyHighlight {
    return {
        rootResourceId: ids[0] ?? null,
        rootResourceIds: ids,
    }
}

function messageMentionsNullEntity(message: string): boolean {
    return /(?:entity|component)\s+['"]null['"]/i.test(message)
}

export function extractQuotedEntityName(message: string): string | undefined {
    const match = message.match(NAMED_ELEMENT_PATTERN)
    if (!match) {
        return undefined
    }

    const quotedName = match[1].trim()
    if (!quotedName || quotedName === 'null') {
        return undefined
    }

    return quotedName
}

function findByQuotedName(
    resources: StructuredResource[],
    message: string,
): StructuredResource | undefined {
    const match = message.match(NAMED_ELEMENT_PATTERN)
    if (!match) {
        return undefined
    }

    const quotedName = match[1].trim()
    if (!quotedName || quotedName === 'null') {
        return undefined
    }

    return resources.find(
        resource => resourceName(resource)?.toLowerCase() === quotedName.toLowerCase(),
    )
}

/**
 * Metamodel-agnostic: map message keywords to element type(s) present in the snapshot.
 */
function findAffectedResources(
    resources: StructuredResource[],
    message: string,
): StructuredResource[] {
    const normalized = message.toLowerCase()

    // SystemRoot-specific Link placement (speed on System Link, protocol on Root Link).
    if (normalized.includes('speed') || normalized.includes('mbits')) {
        const link = pickLinkUnderType(resources, 'System') ?? pickSingleLink(resources)
        return link ? [link] : []
    }
    if (normalized.includes('protocol')) {
        const link = pickLinkUnderType(resources, 'Root') ?? pickSingleLink(resources)
        return link ? [link] : []
    }

    const typeHits = mentionedTypesInMessage(resources, normalized)
    for (const typeName of typeHits) {
        const ofType = resources.filter(resource => resource.type.name === typeName)
        const picked = pickInstancesForHighlight(ofType, normalized)
        if (picked.length > 0) {
            return picked
        }
    }

    // Soft fallback: "has been created" / "create a corresponding" → newest leaf-ish element.
    if (/\b(created|corresponding)\b/i.test(message)) {
        const leafCandidates = resources.filter(
            resource => !LOW_PRIORITY_TYPES.has(resource.type.name),
        )
        const unnamed = leafCandidates.filter(resource => !resourceName(resource))
        if (unnamed.length === 1) {
            return unnamed
        }
        if (unnamed.length > 1) {
            return [unnamed[unnamed.length - 1]]
        }
        if (leafCandidates.length === 1) {
            return leafCandidates
        }
    }

    return []
}

/**
 * Types whose names appear as whole words in the message, highest priority first.
 */
function mentionedTypesInMessage(
    resources: StructuredResource[],
    normalizedMessage: string,
): string[] {
    const presentTypes = [...new Set(resources.map(resource => resource.type.name))]

    const scored = presentTypes
        .map(typeName => {
            const token = typeName.toLowerCase()
            // Match "Task" in "A Task has been created" and "ASCET Task".
            const word = new RegExp(`\\b${escapeRegExp(token)}\\b`, 'i')
            if (!word.test(normalizedMessage)) {
                return null
            }
            let score = token.length
            if (LOW_PRIORITY_TYPES.has(typeName)) {
                score -= 100
            }
            // Prefer exact type over container when both "task" and "componentcontainer" unlikely.
            if (token === 'task' || token.endsWith('task')) {
                score += 20
            }
            if (token === 'entity' || token === 'link') {
                score += 15
            }
            return { typeName, score }
        })
        .filter((entry): entry is { typeName: string, score: number } => entry != null)

    scored.sort((a, b) => b.score - a.score)
    return scored.map(entry => entry.typeName)
}

function pickInstancesForHighlight(
    ofType: StructuredResource[],
    normalizedMessage: string,
): StructuredResource[] {
    if (ofType.length === 0) {
        return []
    }
    if (ofType.length === 1) {
        return ofType
    }

    const unnamed = ofType.filter(resource => !resourceName(resource))
    if (unnamed.length === 1) {
        return unnamed
    }
    if (unnamed.length > 1) {
        // Several unnamed (e.g. multiple Tasks) — highlight the last (most recently added).
        return [unnamed[unnamed.length - 1]]
    }

    // Named instances only: if message is a create/correspondence prompt, prefer the last one.
    if (/\b(created|corresponding|component type)\b/i.test(normalizedMessage)) {
        return [ofType[ofType.length - 1]]
    }

    return []
}

function pickSingleLink(resources: StructuredResource[]): StructuredResource | undefined {
    const links = resources.filter(resource => resource.type.name === 'Link')
    if (links.length === 1) {
        return links[0]
    }
    const unnamed = links.filter(resource => !resourceName(resource))
    if (unnamed.length === 1) {
        return unnamed[0]
    }
    return undefined
}

function pickLinkUnderType(
    resources: StructuredResource[],
    ancestorType: 'System' | 'Root',
): StructuredResource | undefined {
    const byId = new Map(resources.map(resource => [resource.id, resource]))
    const links = resources.filter(resource => resource.type.name === 'Link')

    return links.find(link => {
        let current: StructuredResource | undefined = link
        while (current) {
            if (current.type.name === ancestorType) {
                return true
            }
            current = current.parentId ? byId.get(current.parentId) : undefined
        }
        return false
    })
}

function resourceName(resource: StructuredResource): string | undefined {
    const nameAttr = resource.attributes.find(attr => attr.info.name === 'name')
    const value = nameAttr?.value
    if (typeof value !== 'string' || value === 'null' || value.trim() === '') {
        return undefined
    }
    return value
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Maps a correspondence-context element back to a structured resource in the hub model.
 */
export function findResourceForContextElement(
    element: ModelElementNode | undefined,
    resources: StructuredResource[],
): StructuredResource | undefined {
    if (!element) {
        return undefined
    }

    const all = getAllStructuredResources(resources)

    if (element.uri) {
        const byUri = all.find(resource => resource.resourceSetInfo?.uri === element.uri)
        if (byUri) {
            return byUri
        }
    }

    const byTypeAndName = all.find(resource => {
        if (resource.type.name !== element.eClassName) {
            return false
        }
        const name = resourceName(resource)
        if (!name) {
            return false
        }
        return element.displayName.toLowerCase().includes(name.toLowerCase())
    })
    if (byTypeAndName) {
        return byTypeAndName
    }

    return all.find(resource => resource.type.name === element.eClassName)
}
