// NOTE: AI-generated test (Claude Code), only lightly reviewed. It asserts current
// behavior; if it conflicts with the requirements, trust the requirements.
// Tests converting structured resources into tree nodes: labels, nested children,
// add options (disabled when a reference is full) and the dispatched add action.

import { describe, expect, it, vi } from 'vitest'
import { ResourcesStructuredToTreeConverter } from './resources-structured-to-tree-converter.ts'
import type {
    StructuredContainmentReference,
    StructuredResource,
} from '../types/structured-resource.ts'
import type { StructuredEcoreClass } from '../types/structured-ecore-model.ts'

function ecoreClass(name: string, overrides: Partial<StructuredEcoreClass> = {}) {
    return {
        id: `model#//${name}`,
        name,
        subTypes: [],
        canInstantiate: true,
        ...overrides,
    } as unknown as StructuredEcoreClass
}

function containment(
    name: string,
    value: StructuredContainmentReference['value'],
    opts: { isArray: boolean; maxItems: number; subTypes: StructuredEcoreClass[] },
): StructuredContainmentReference {
    return {
        value,
        info: {
            id: `ref-${name}`,
            name,
            type: ecoreClass(`${name}Type`, { subTypes: opts.subTypes }),
            isArray: opts.isArray,
            minItems: 0,
            maxItems: opts.maxItems,
            uniqueItems: false,
            isInherited: false,
        },
    }
}

function resource(
    id: string,
    typeName: string,
    opts: {
        name?: string
        containmentReferences?: StructuredContainmentReference[]
        propertiesWithErrors?: string[]
    } = {},
): StructuredResource {
    return {
        id,
        parentId: undefined,
        type: ecoreClass(typeName),
        attributes: opts.name
            ? [
                  {
                      value: opts.name,
                      info: {
                          name: 'name',
                      } as unknown as StructuredResource['attributes'][0]['info'],
                  },
              ]
            : [],
        simpleReferences: [],
        containmentReferences: opts.containmentReferences ?? [],
        resourceSetInfo: undefined,
        propertiesWithErrors: opts.propertiesWithErrors ?? [],
    }
}

const instantiable = ecoreClass('Entity')
const abstract = ecoreClass('AbstractEntity', { canInstantiate: false })

describe('ResourcesStructuredToTreeConverter', () => {
    const underTest = new ResourcesStructuredToTreeConverter()

    it('converts a single resource and its contained children into tree nodes', () => {
        const child = resource('child', 'Entity', { name: 'Customer' })
        const root = resource('root', 'Root', {
            name: 'Shop',
            containmentReferences: [
                containment('entities', [child], {
                    isArray: true,
                    maxItems: 5,
                    subTypes: [instantiable, abstract],
                }),
            ],
        })

        const [node] = underTest.convert(root, vi.fn())

        expect(node.id).toBe('root')
        expect(node.label).toBe('Shop : Root')
        expect(node.inputErrorSeverity).toBeUndefined()
        expect(node.children).toHaveLength(1)
        expect(node.children?.[0]).toMatchObject({ id: 'child', label: 'Customer : Entity' })
        // only instantiable sub types are offered
        expect(node.options).toEqual([
            expect.objectContaining({
                key: 'ref-entitiesmodel#//Entity',
                label: 'entities : Entity',
                disabled: false,
            }),
        ])
    })

    it('converts an array of resources', () => {
        const nodes = underTest.convert([resource('a', 'A'), resource('b', 'B')], vi.fn())
        expect(nodes.map((n) => n.id)).toEqual(['a', 'b'])
    })

    it('disables options when a containment reference is full', () => {
        const full = containment('items', [resource('x', 'X'), resource('y', 'Y')], {
            isArray: true,
            maxItems: 2,
            subTypes: [instantiable],
        })
        const single = containment('owner', resource('z', 'Z'), {
            isArray: false,
            maxItems: 1,
            subTypes: [instantiable],
        })
        const empty = containment('extra', undefined, {
            isArray: false,
            maxItems: 1,
            subTypes: [instantiable],
        })
        const root = resource('root', 'Root', { containmentReferences: [full, single, empty] })

        const [node] = underTest.convert(root, vi.fn())

        expect(node.options?.map((o) => o.disabled)).toEqual([true, true, false])
        expect(node.children?.map((c) => c.id)).toEqual(['x', 'y', 'z'])
    })

    it('marks resources with property errors', () => {
        const [node] = underTest.convert(
            resource('r', 'Root', { propertiesWithErrors: ['name'] }),
            vi.fn(),
        )
        expect(node.inputErrorSeverity).toBe('reject')
    })

    it('dispatches an ADD_CONTAINMENT_REFERENCE action when an option is clicked', () => {
        const dispatch = vi.fn()
        const root = resource('root', 'Root', {
            containmentReferences: [
                containment('entities', undefined, {
                    isArray: true,
                    maxItems: 5,
                    subTypes: [instantiable],
                }),
            ],
        })

        const [node] = underTest.convert(root, dispatch)
        node.options?.[0].onClick()

        expect(dispatch).toHaveBeenCalledWith({
            type: 'ADD_CONTAINMENT_REFERENCE',
            ownerId: 'root',
            containmentReferenceId: 'ref-entities',
            dataTypeId: 'model#//Entity',
            ignoreInputErrors: false,
        })
    })
})
