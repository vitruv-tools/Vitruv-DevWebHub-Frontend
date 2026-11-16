// NOTE: AI-generated test (Claude Code), only lightly reviewed. It asserts current
// behavior; if it conflicts with the requirements, trust the requirements.
// Tests generating the Mermaid class diagram from structured resources:
// class definitions, attribute values, references and the resource-to-Mermaid id map.

import { describe, expect, it } from 'vitest'
import { ResourcesStructuredToMermaidConverter } from './resources-structured-to-mermaid-converter.ts'
import type { Property, StructuredResource } from '../types/structured-resource.ts'
import { structuredResourceShortLabel } from '../helpers/display-helpers.ts'

type Info = StructuredResource['attributes'][0]['info']

function attribute(name: string, value: string | string[] | undefined): Property<string> {
    return { value, info: { name, type: { name: 'EString' } } as unknown as Info }
}

function reference<T>(name: string, value: T | T[] | undefined): Property<T> {
    return { value, info: { name } as unknown as Info }
}

function resource(
    id: string,
    typeName: string,
    opts: {
        attributes?: Property<string>[]
        simple?: Property<StructuredResource>[]
        contained?: Property<StructuredResource>[]
    } = {},
): StructuredResource {
    return {
        id,
        parentId: undefined,
        type: { name: typeName } as unknown as StructuredResource['type'],
        attributes: opts.attributes ?? [],
        simpleReferences: opts.simple ?? [],
        containmentReferences: opts.contained ?? [],
        resourceSetInfo: undefined,
        propertiesWithErrors: [],
    }
}

describe('ResourcesStructuredToMermaidConverter', () => {
    it('renders classes, attribute values and references', () => {
        const customer = resource('cust-1', 'Entity', {
            attributes: [attribute('name', 'Customer'), attribute('tags', ['a', 'b'])],
        })
        const order = resource('order-1', 'Entity', {
            attributes: [attribute('name', 'Order'), attribute('note', undefined)],
            simple: [reference('owner', customer), reference('none', undefined)],
        })
        const root = resource('root', 'Root', {
            contained: [reference('entities', [customer, order]), reference('empty', undefined)],
        })

        const converter = new ResourcesStructuredToMermaidConverter()
        const diagram = converter.convert(root)

        expect(diagram.startsWith('classDiagram\n')).toBe(true)
        expect(diagram).toContain('class nroot["Root"]')
        expect(diagram).toContain('class ncust1["Customer : Entity"] {\nname : EString = Customer')
        expect(diagram).toContain('tags : EString = [a,b]')
        expect(diagram).toContain('note : EString = null')
        expect(diagram).toContain('nroot *-- ncust1 : entities')
        expect(diagram).toContain('nroot *-- norder1 : entities')
        expect(diagram).toContain('norder1 --> ncust1 : owner')
        // each resource is only defined once even when referenced several times
        expect(diagram.match(/class ncust1/g)).toHaveLength(1)
        expect(converter.getResourceIdToMermaidIdMap()).toEqual({
            root: 'nroot',
            'cust-1': 'ncust1',
            'order-1': 'norder1',
        })
    })

    it('renders several top-level resources and resets between conversions', () => {
        const converter = new ResourcesStructuredToMermaidConverter()
        converter.convert(resource('first', 'A'))

        const diagram = converter.convertAll([resource('a', 'A'), resource('b', 'B')])

        expect(diagram).toContain('class na["A"]')
        expect(diagram).toContain('class nb["B"]')
        expect(converter.getResourceIdToMermaidIdMap()).toEqual({ a: 'na', b: 'nb' })
    })

    it('uses a random id when the resource id has no usable characters', () => {
        const converter = new ResourcesStructuredToMermaidConverter()
        converter.convert(resource('/#/', 'A'))

        const mermaidId = converter.getResourceIdToMermaidIdMap()['/#/']
        expect(mermaidId).toMatch(/^.{12}$/)
    })

    it('truncates long names in the short label', () => {
        const long = resource('x', 'Entity', { attributes: [attribute('name', 'N'.repeat(30))] })
        expect(structuredResourceShortLabel(long)).toBe(`${'N'.repeat(30)} : Entity`)
        expect(structuredResourceShortLabel(long, 10).length).toBeLessThan(30)
    })
})
