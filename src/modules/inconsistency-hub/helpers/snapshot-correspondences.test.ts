import { describe, expect, it } from 'vitest'
import type { StructuredResource } from '../../model-editor/types/structured-resource.ts'
import type { InconsistencyContext, ModelElementNode } from '../types/open-inconsistency.ts'
import {
    buildInferredCorrespondencePairs,
    linkedResourceIdsFor,
    resolveHubCorrespondencePairs,
} from './snapshot-correspondences.ts'

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
        type: type as StructuredResource['type'],
        attributes: [
            {
                info: type.attributes.name as StructuredResource['attributes'][0]['info'],
                value: opts?.name,
            },
        ],
        simpleReferences: [],
        containmentReferences: [],
        resourceSetInfo: opts?.uri ? { _id: id, uri: opts.uri } : undefined,
        propertiesWithErrors: [],
    }
}

function keyOf(pairs: Array<[string, string]>): string[] {
    return pairs.map(([a, b]) => (a < b ? `${a}|${b}` : `${b}|${a}`)).sort()
}

describe('buildInferredCorrespondencePairs', () => {
    it('pairs System with Root', () => {
        const system = resource('s', 'System')
        const root = resource('r', 'Root')
        const pairs = buildInferredCorrespondencePairs([system, root])
        expect(keyOf(pairs)).toContain('r|s')
    })

    it('pairs Entity with same-named component (case-insensitive)', () => {
        const entity = resource('e', 'Entity', { name: 'Brake' })
        const server = resource('c', 'Server', { name: 'brake' })
        const pairs = buildInferredCorrespondencePairs([entity, server])
        expect(keyOf(pairs)).toContain('c|e')
    })

    it('ignores unnamed entities', () => {
        const entity = resource('e', 'Entity')
        const server = resource('c', 'Server', { name: 'brake' })
        const pairs = buildInferredCorrespondencePairs([entity, server])
        expect(pairs).toHaveLength(0)
    })

    it('pairs two unnamed links as the typical demo correspondence', () => {
        const system = resource('s', 'System')
        const sysLink = resource('sl', 'Link', { parentId: 's' })
        const root = resource('r', 'Root')
        const rootLink = resource('rl', 'Link', { parentId: 'r' })
        const pairs = buildInferredCorrespondencePairs([system, sysLink, root, rootLink])
        expect(keyOf(pairs)).toContain('rl|sl')
    })

    it('pairs named links that share a name', () => {
        const a = resource('la', 'Link', { name: 'busA' })
        const b = resource('lb', 'Link', { name: 'BusA' })
        const pairs = buildInferredCorrespondencePairs([a, b])
        expect(keyOf(pairs)).toContain('la|lb')
    })

    it('does not duplicate pairs and never self-pairs', () => {
        const system = resource('s', 'System')
        const root = resource('r', 'Root')
        const pairs = buildInferredCorrespondencePairs([system, root, system, root])
        expect(pairs).toHaveLength(1)
        expect(pairs.every(([a, b]) => a !== b)).toBe(true)
    })

    it('returns nothing for an empty snapshot', () => {
        expect(buildInferredCorrespondencePairs([])).toEqual([])
    })
})

describe('resolveHubCorrespondencePairs', () => {
    it('falls back to inferred pairs when context is null', () => {
        const system = resource('s', 'System')
        const root = resource('r', 'Root')
        const pairs = resolveHubCorrespondencePairs([system, root], null)
        expect(keyOf(pairs)).toEqual(['r|s'])
    })

    it('falls back to inferred pairs when context has no correspondences', () => {
        const system = resource('s', 'System')
        const root = resource('r', 'Root')
        const context: InconsistencyContext = {
            inconsistencyId: 'i',
            vsumId: 'v',
            elements: [],
            correspondences: [],
        }
        const pairs = resolveHubCorrespondencePairs([system, root], context)
        expect(keyOf(pairs)).toEqual(['r|s'])
    })

    it('merges server correspondences with inferred ones without duplicates', () => {
        const system = resource('s', 'System')
        const root = resource('r', 'Root')
        const entity = resource('e', 'Entity', { name: 'Brake', uri: 'model.model#e' })
        const server = resource('c', 'Server', { name: 'Brake', uri: 'model2.model2#c' })

        const elements: ModelElementNode[] = [
            { id: 'E1', displayName: 'Brake', eClassName: 'Entity', metamodelName: 'model', uri: 'model.model#e', role: 'source' },
            { id: 'C1', displayName: 'Brake', eClassName: 'Server', metamodelName: 'model2', uri: 'model2.model2#c', role: 'target' },
        ]
        const context: InconsistencyContext = {
            inconsistencyId: 'i',
            vsumId: 'v',
            elements,
            correspondences: [
                { sourceId: 'E1', targetId: 'C1', sourceLabel: 'Brake', targetLabel: 'Brake' },
            ],
        }

        const pairs = resolveHubCorrespondencePairs([system, root, entity, server], context)
        // server pair (entity<->server) plus inferred (system<->root and entity<->server by name)
        expect(keyOf(pairs)).toContain('c|e')
        expect(keyOf(pairs)).toContain('r|s')
        // entity<->server must appear only once even though inference would also find it
        expect(keyOf(pairs).filter(k => k === 'c|e')).toHaveLength(1)
    })
})

describe('linkedResourceIdsFor', () => {
    const pairs: Array<[string, string]> = [['a', 'b'], ['b', 'c']]

    it('finds neighbours regardless of pair direction', () => {
        expect(linkedResourceIdsFor('a', pairs).sort()).toEqual(['b'])
        expect(linkedResourceIdsFor('b', pairs).sort()).toEqual(['a', 'c'])
        expect(linkedResourceIdsFor('c', pairs).sort()).toEqual(['b'])
    })

    it('returns empty for an unknown resource', () => {
        expect(linkedResourceIdsFor('z', pairs)).toEqual([])
    })
})
