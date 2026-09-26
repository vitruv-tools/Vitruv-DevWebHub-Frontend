import { describe, expect, it } from 'vitest'
import type { StructuredResource } from '../../model-editor/types/structured-resource.ts'
import type { ModelElementNode, OpenInconsistency } from '../types/open-inconsistency.ts'
import { findResourceForContextElement, resolveInconsistencyHighlight } from './inconsistency-highlight-helpers.ts'

function stubType(name: string) {
    return {
        id: `http://example#//${name}`,
        name,
        attributes: {
            name: {
                id: `${name}.name`,
                name: 'name',
                type: { id: 'EString', name: 'EString' },
                isArray: false,
                minItems: 0,
                maxItems: 1,
                canInstantiate: false,
                isChangeable: true,
            },
        },
        simpleReferences: {},
        containmentReferences: {},
        subTypes: [],
        canInstantiate: true,
    }
}

function resource(
    id: string,
    typeName: string,
    opts?: { name?: string, parentId?: string, uri?: string },
): StructuredResource {
    const type = stubType(typeName)
    return {
        id,
        parentId: opts?.parentId,
        type: type as unknown as StructuredResource['type'],
        attributes: [
            {
                info: type.attributes.name as unknown as StructuredResource['attributes'][0]['info'],
                value: opts?.name,
            },
        ],
        simpleReferences: [],
        containmentReferences: [],
        resourceSetInfo: opts?.uri ? { _id: id, uri: opts.uri } : undefined,
        propertiesWithErrors: [],
    }
}

function contextElement(overrides: Partial<ModelElementNode>): ModelElementNode {
    return {
        id: 'E1',
        displayName: 'Element',
        eClassName: 'Entity',
        metamodelName: 'model',
        uri: '',
        role: 'source',
        ...overrides,
    }
}

function inconsistency(message: string): OpenInconsistency {
    return {
        id: 'i1',
        vsumId: 'v1',
        taskId: 't1',
        viewId: 'view1',
        title: message,
        message,
        state: 'OPEN',
    }
}

describe('resolveInconsistencyHighlight', () => {
    it('highlights Amalthea Task for ASCET create prompt', () => {
        const container = resource('.0/', 'ComponentContainer', { name: 'App' })
        const task = resource('.0//@tasks.0', 'Task', { parentId: container.id })
        const highlight = resolveInconsistencyHighlight(
            [container, task],
            inconsistency('A Task has been created. Create a corresponding ASCET Task?'),
        )
        expect(highlight.rootResourceIds).toEqual([task.id])
    })

    it('highlights last unnamed Task when several exist', () => {
        const t1 = resource('t1', 'Task')
        const t2 = resource('t2', 'Task')
        const highlight = resolveInconsistencyHighlight(
            [t1, t2],
            inconsistency('A Task has been created. Create a corresponding ASCET Task?'),
        )
        expect(highlight.rootResourceIds).toEqual([t2.id])
    })

    it('highlights SystemRoot Entity by quoted name', () => {
        const root = resource('r', 'Root')
        const entity = resource('e', 'Entity', { name: 'Brake', parentId: root.id })
        const highlight = resolveInconsistencyHighlight(
            [root, entity],
            inconsistency("Select the component type of the entity 'Brake'."),
        )
        expect(highlight.rootResourceIds).toEqual([entity.id])
    })

    it('highlights unnamed Entity for null-name prompt', () => {
        const entity = resource('e', 'Entity')
        const highlight = resolveInconsistencyHighlight(
            [entity],
            inconsistency("Select the component type of the entity 'null'."),
        )
        expect(highlight.rootResourceIds).toEqual([entity.id])
    })

    it('prefers System Link for speed prompts', () => {
        const system = resource('s', 'System')
        const sysLink = resource('sl', 'Link', { parentId: system.id })
        const root = resource('r', 'Root')
        const rootLink = resource('rl', 'Link', { parentId: root.id })
        const highlight = resolveInconsistencyHighlight(
            [system, sysLink, root, rootLink],
            inconsistency('Please specify the link speed in MBits/s.'),
        )
        expect(highlight.rootResourceIds).toEqual([sysLink.id])
    })

    it('prefers Root Link for protocol prompts', () => {
        const system = resource('s', 'System')
        const sysLink = resource('sl', 'Link', { parentId: system.id })
        const root = resource('r', 'Root')
        const rootLink = resource('rl', 'Link', { parentId: root.id })
        const highlight = resolveInconsistencyHighlight(
            [system, sysLink, root, rootLink],
            inconsistency('Choose the supported protocol for this link.'),
        )
        expect(highlight.rootResourceIds).toEqual([rootLink.id])
    })

    it('returns nothing for an empty snapshot', () => {
        const highlight = resolveInconsistencyHighlight([], inconsistency('anything'))
        expect(highlight.rootResourceIds).toEqual([])
        expect(highlight.rootResourceId).toBeNull()
    })

    it('does not guess when the named element is absent from the snapshot', () => {
        const other = resource('e', 'Entity', { name: 'Throttle' })
        const highlight = resolveInconsistencyHighlight(
            [other],
            inconsistency("Select the component type of the entity 'Brake'."),
        )
        expect(highlight.rootResourceIds).toEqual([])
    })

    it('exposes the first id as the single tree-highlight root', () => {
        const t1 = resource('t1', 'Task')
        const t2 = resource('t2', 'Task')
        const highlight = resolveInconsistencyHighlight(
            [t1, t2],
            inconsistency('A Task has been created. Create a corresponding ASCET Task?'),
        )
        expect(highlight.rootResourceId).toBe(highlight.rootResourceIds[0])
    })
})

describe('findResourceForContextElement', () => {
    it('returns undefined when the element is undefined', () => {
        const entity = resource('e', 'Entity', { name: 'Brake' })
        expect(findResourceForContextElement(undefined, [entity])).toBeUndefined()
    })

    it('matches by resource-set uri first', () => {
        const entity = resource('e', 'Entity', { name: 'Brake', uri: 'model.model#e' })
        const decoy = resource('d', 'Entity', { name: 'Brake' })
        const found = findResourceForContextElement(
            contextElement({ eClassName: 'Entity', displayName: 'Something else', uri: 'model.model#e' }),
            [decoy, entity],
        )
        expect(found?.id).toBe('e')
    })

    it('matches by eClass and name when uri is missing', () => {
        const entity = resource('e', 'Entity', { name: 'Brake' })
        const found = findResourceForContextElement(
            contextElement({ eClassName: 'Entity', displayName: 'Entity Brake (source)' }),
            [entity],
        )
        expect(found?.id).toBe('e')
    })

    it('falls back to eClass match when name does not line up', () => {
        const entity = resource('e', 'Entity', { name: 'Brake' })
        const found = findResourceForContextElement(
            contextElement({ eClassName: 'Entity', displayName: 'Unrelated' }),
            [entity],
        )
        expect(found?.id).toBe('e')
    })

    it('returns undefined when no resource has the eClass', () => {
        const link = resource('l', 'Link')
        const found = findResourceForContextElement(
            contextElement({ eClassName: 'Entity', displayName: 'Brake' }),
            [link],
        )
        expect(found).toBeUndefined()
    })
})
