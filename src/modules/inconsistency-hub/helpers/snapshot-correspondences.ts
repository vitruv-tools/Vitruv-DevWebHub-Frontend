import type { StructuredResource } from '../../model-editor/types/structured-resource.ts'
import { getAllStructuredResources } from '../../model-editor/helpers/structured-resource-helpers.ts'
import type { InconsistencyContext } from '../types/open-inconsistency.ts'
import { findResourceForContextElement } from './inconsistency-highlight-helpers.ts'

const SYSTEM_COMPONENT_TYPES = new Set(['Server', 'Device', 'Component'])

/**
 * Inferred SystemRoot-style correspondences from a Hub model snapshot.
 * Used when live Vitruvius correspondences are unavailable (e.g. OPEN / parked).
 * Frontend-only fallback — does not change park/resolve or server APIs.
 */
export function buildInferredCorrespondencePairs(
    structuredResources: StructuredResource[],
): Array<[string, string]> {
    const all = getAllStructuredResources(structuredResources)
    const pairs: Array<[string, string]> = []
    const seen = new Set<string>()

    const addPair = (a: string, b: string) => {
        if (a === b) {
            return
        }
        const key = a < b ? `${a}|${b}` : `${b}|${a}`
        if (seen.has(key)) {
            return
        }
        seen.add(key)
        pairs.push([a, b])
    }

    const system = all.find(resource => resource.type.name === 'System')
    const root = all.find(resource => resource.type.name === 'Root')
    if (system && root) {
        addPair(system.id, root.id)
    }

    const entities = all.filter(resource => resource.type.name === 'Entity')
    const components = all.filter(resource => SYSTEM_COMPONENT_TYPES.has(resource.type.name))
    for (const entity of entities) {
        const entityName = resourceName(entity)
        if (!entityName) {
            continue
        }
        for (const component of components) {
            if (resourceName(component)?.toLowerCase() === entityName.toLowerCase()) {
                addPair(entity.id, component.id)
            }
        }
    }

    const links = all.filter(resource => resource.type.name === 'Link')
    for (let i = 0; i < links.length; i++) {
        const left = links[i]
        const leftName = resourceName(left)
        for (let j = i + 1; j < links.length; j++) {
            const right = links[j]
            const rightName = resourceName(right)
            if (leftName && rightName && leftName.toLowerCase() === rightName.toLowerCase()) {
                addPair(left.id, right.id)
            }
        }
    }

    // Typical demo: one unnamed Link under Root and one under System.
    const unnamedLinks = links.filter(link => !resourceName(link))
    if (unnamedLinks.length === 2) {
        addPair(unnamedLinks[0].id, unnamedLinks[1].id)
    }

    return pairs
}

/**
 * Prefer live server correspondences when present; otherwise fall back to snapshot inference.
 */
export function resolveHubCorrespondencePairs(
    structuredResources: StructuredResource[],
    context: InconsistencyContext | null,
): Array<[string, string]> {
    const inferred = buildInferredCorrespondencePairs(structuredResources)
    const fromServer = correspondencePairsFromContext(structuredResources, context)

    if (fromServer.length === 0) {
        return inferred
    }

    const seen = new Set(fromServer.map(([a, b]) => (a < b ? `${a}|${b}` : `${b}|${a}`)))
    const merged = [...fromServer]
    for (const [a, b] of inferred) {
        const key = a < b ? `${a}|${b}` : `${b}|${a}`
        if (!seen.has(key)) {
            seen.add(key)
            merged.push([a, b])
        }
    }
    return merged
}

export function linkedResourceIdsFor(
    resourceId: string,
    pairs: Array<[string, string]>,
): string[] {
    const linked: string[] = []
    for (const [a, b] of pairs) {
        if (a === resourceId) {
            linked.push(b)
        } else if (b === resourceId) {
            linked.push(a)
        }
    }
    return linked
}

function correspondencePairsFromContext(
    structuredResources: StructuredResource[],
    context: InconsistencyContext | null,
): Array<[string, string]> {
    if (!context?.correspondences?.length) {
        return []
    }

    const pairs: Array<[string, string]> = []
    const seen = new Set<string>()

    for (const edge of context.correspondences) {
        const source = findResourceForContextElement(
            context.elements.find(element => element.id === edge.sourceId),
            structuredResources,
        )
        const target = findResourceForContextElement(
            context.elements.find(element => element.id === edge.targetId),
            structuredResources,
        )
        if (!source || !target || source.id === target.id) {
            continue
        }
        const key = source.id < target.id ? `${source.id}|${target.id}` : `${target.id}|${source.id}`
        if (seen.has(key)) {
            continue
        }
        seen.add(key)
        pairs.push([source.id, target.id])
    }

    return pairs
}

function resourceName(resource: StructuredResource): string | undefined {
    const nameAttr = resource.attributes.find(attr => attr.info.name === 'name')
    const value = nameAttr?.value
    if (typeof value !== 'string' || value === 'null' || value.trim() === '') {
        return undefined
    }
    return value
}
