// NOTE: AI-generated test (Claude Code), only lightly reviewed. It asserts current
// behavior; if it conflicts with the requirements, trust the requirements.
// Tests adding the entity named in an inconsistency message to the hub model
// when it is missing, including cases where nothing should change and nested Roots.

import { describe, expect, it } from 'vitest'
import type {
    StructuredContainmentReference,
    StructuredResource,
} from '../../model-editor/types/structured-resource.ts'
import type { OpenInconsistency } from '../types/open-inconsistency.ts'
import { enrichModelForInconsistency } from './inconsistency-model-enrichment.ts'

type Info = StructuredResource['attributes'][0]['info']

function ref(name: string, value: StructuredContainmentReference['value']) {
    return { value, info: { name } as unknown as Info }
}

function resource(
    id: string,
    typeName: string,
    opts: { name?: string; refs?: StructuredContainmentReference[] } = {},
): StructuredResource {
    return {
        id,
        parentId: undefined,
        type: { name: typeName } as unknown as StructuredResource['type'],
        attributes: [
            { value: opts.name, info: { name: 'name' } as unknown as Info },
            { value: 'kept', info: { name: 'description' } as unknown as Info },
        ],
        simpleReferences: [],
        containmentReferences: opts.refs ?? [],
        resourceSetInfo: undefined,
        propertiesWithErrors: [],
    }
}

function inconsistency(message: string | null, title = ''): OpenInconsistency {
    return { id: 'i1', vsumId: 'v1', taskId: 't1', viewId: 'w1', title, message, state: 'OPEN' }
}

function entityNames(root: StructuredResource): (string | undefined)[] {
    const entities = root.containmentReferences.find((r) => r.info.name === 'entities')?.value
    return ([] as StructuredResource[])
        .concat(entities ?? [])
        .map((e) => e.attributes[0].value as string | undefined)
}

describe('enrichModelForInconsistency', () => {
    it('returns the model unchanged when the message names no entity', () => {
        const model = [resource('root', 'Root')]
        expect(enrichModelForInconsistency(model, inconsistency(null, 'Something broke'))).toBe(
            model,
        )
    })

    it('returns the model unchanged when the entity already exists (case-insensitive)', () => {
        const model = [
            resource('root', 'Root', {
                refs: [ref('entities', [resource('e1', 'Entity', { name: 'Customer' })])],
            }),
        ]
        expect(enrichModelForInconsistency(model, inconsistency("entity 'customer'"))).toBe(model)
    })

    it('returns the model unchanged without a Root or an Entity template', () => {
        const noTemplate = [resource('root', 'Root', { refs: [ref('entities', undefined)] })]
        expect(enrichModelForInconsistency(noTemplate, inconsistency("entity 'Order'"))).toBe(
            noTemplate,
        )

        const noRoot = [resource('e1', 'Entity', { name: 'Customer' })]
        expect(enrichModelForInconsistency(noRoot, inconsistency("entity 'Order'"))).toBe(noRoot)
    })

    it('returns the model unchanged when Root has no entities reference', () => {
        const model = [
            resource('root', 'Root', {
                refs: [ref('other', [resource('e1', 'Entity', { name: 'Customer' })])],
            }),
        ]
        expect(enrichModelForInconsistency(model, inconsistency("entity 'Order'"))).toBe(model)
    })

    it('adds the missing entity to the entities of a top-level Root', () => {
        const other = ref('other', undefined)
        const model = [
            resource('root', 'Root', {
                refs: [other, ref('entities', [resource('e1', 'Entity', { name: 'Customer' })])],
            }),
        ]

        const [root] = enrichModelForInconsistency(model, inconsistency("Entity 'Order' is gone"))

        expect(entityNames(root)).toEqual(['Customer', 'Order'])
        expect(root.containmentReferences[0]).toBe(other)
        const added = root.containmentReferences[1].value as StructuredResource[]
        expect(added[1]).toMatchObject({ id: 'root-hub-entity-Order', parentId: 'root' })
        expect(added[1].attributes[1].value).toBe('kept')
    })

    it('handles a single entity value and an empty entities reference', () => {
        const template = resource('t', 'Entity', { name: 'Customer' })
        const single = [resource('root', 'Root', { refs: [ref('entities', template)] })]
        expect(
            entityNames(enrichModelForInconsistency(single, inconsistency("entity 'Order'"))[0]),
        ).toEqual(['Customer', 'Order'])

        const empty = [resource('root', 'Root', { refs: [ref('entities', undefined)] }), template]
        expect(
            entityNames(enrichModelForInconsistency(empty, inconsistency("entity 'Order'"))[0]),
        ).toEqual(['Order'])
    })

    it('replaces a Root that is nested inside other resources', () => {
        const template = resource('t', 'Entity', { name: 'Customer' })
        const root = resource('root', 'Root', { refs: [ref('entities', [template])] })
        const sibling = resource('sibling', 'Other', { refs: [ref('leaf', undefined)] })
        const model = [
            resource('outer-array', 'Container', {
                refs: [ref('empty', undefined), ref('items', [sibling, root])],
            }),
            resource('outer-single', 'Container', {
                refs: [
                    ref(
                        'wrapper',
                        resource('wrapper', 'Wrapper', {
                            refs: [ref('deep', resource('deep', 'Deep'))],
                        }),
                    ),
                ],
            }),
            resource('outer-direct', 'Container', { refs: [ref('root', root)] }),
        ]

        const result = enrichModelForInconsistency(model, inconsistency("entity 'Order'"))

        const replacedInArray = (
            result[0].containmentReferences[1].value as StructuredResource[]
        )[1]
        expect(entityNames(replacedInArray)).toEqual(['Customer', 'Order'])
        const replacedSingle = result[2].containmentReferences[0].value as StructuredResource
        expect(entityNames(replacedSingle)).toEqual(['Customer', 'Order'])
        // unrelated resources keep their content
        expect(result[1].containmentReferences[0].value).toMatchObject({ id: 'wrapper' })
    })
})
