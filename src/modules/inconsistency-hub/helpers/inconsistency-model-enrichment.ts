import type { StructuredResource } from '../../model-editor/types/structured-resource.ts'
import { getAllStructuredResources } from '../../model-editor/helpers/structured-resource-helpers.ts'
import type { OpenInconsistency } from '../types/open-inconsistency.ts'
import { extractQuotedEntityName } from './inconsistency-highlight-helpers.ts'

/**
 * Ensures the entity named in a parked inconsistency message appears in the hub model
 * when the snapshot was captured without it.
 */
export function enrichModelForInconsistency(
    structuredResources: StructuredResource[],
    inconsistency: OpenInconsistency,
): StructuredResource[] {
    const message = inconsistency.message ?? inconsistency.title ?? ''
    const entityName = extractQuotedEntityName(message)
    if (!entityName) {
        return structuredResources
    }

    const all = getAllStructuredResources(structuredResources)
    if (all.some(resource => resourceName(resource)?.toLowerCase() === entityName.toLowerCase())) {
        return structuredResources
    }

    const root = all.find(resource => resource.type.name === 'Root')
    const template = all.find(resource => resource.type.name === 'Entity')
    if (!root || !template) {
        return structuredResources
    }

    const entitiesRef = root.containmentReferences.find(ref => ref.info.name === 'entities')
    if (!entitiesRef) {
        return structuredResources
    }

    const newEntityId = `${root.id}-hub-entity-${entityName}`
    const newEntity: StructuredResource = {
        id: newEntityId,
        parentId: root.id,
        type: template.type,
        attributes: template.attributes.map(attr => ({
            ...attr,
            value: attr.info.name === 'name' ? entityName : attr.value,
        })),
        simpleReferences: [],
        containmentReferences: [],
        resourceSetInfo: undefined,
        propertiesWithErrors: [],
    }

    const updatedRoot: StructuredResource = {
        ...root,
        containmentReferences: root.containmentReferences.map(ref => {
            if (ref.info.name !== 'entities') {
                return ref
            }

            const existing = ref.value
            const nested = existing == null ? [] : Array.isArray(existing) ? existing : [existing]
            return {
                ...ref,
                value: [...nested, newEntity],
            }
        }),
    }

    return replaceResource(structuredResources, updatedRoot)
}

function replaceResource(
    resources: StructuredResource[],
    updated: StructuredResource,
): StructuredResource[] {
    return resources.map(resource => {
        if (resource.id === updated.id) {
            return updated
        }

        return {
            ...resource,
            containmentReferences: resource.containmentReferences.map(ref => {
                if (ref.value == null) {
                    return ref
                }

                if (Array.isArray(ref.value)) {
                    return {
                        ...ref,
                        value: ref.value.map(child =>
                            child.id === updated.id ? updated : replaceNestedResource(child, updated),
                        ),
                    }
                }

                const child = ref.value
                return {
                    ...ref,
                    value: child.id === updated.id ? updated : replaceNestedResource(child, updated),
                }
            }),
        }
    })
}

function replaceNestedResource(
    resource: StructuredResource,
    updated: StructuredResource,
): StructuredResource {
    if (resource.id === updated.id) {
        return updated
    }

    return {
        ...resource,
        containmentReferences: resource.containmentReferences.map(ref => {
            if (ref.value == null) {
                return ref
            }

            if (Array.isArray(ref.value)) {
                return {
                    ...ref,
                    value: ref.value.map(child =>
                        child.id === updated.id ? updated : replaceNestedResource(child, updated),
                    ),
                }
            }

            const child = ref.value
            return {
                ...ref,
                value: child.id === updated.id ? updated : replaceNestedResource(child, updated),
            }
        }),
    }
}

function resourceName(resource: StructuredResource): string | undefined {
    const nameAttr = resource.attributes.find(attr => attr.info.name === 'name')
    const value = nameAttr?.value
    if (typeof value !== 'string' || value === 'null' || value.trim() === '') {
        return undefined
    }
    return value
}
