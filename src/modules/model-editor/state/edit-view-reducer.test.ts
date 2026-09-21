import { describe, expect, it } from 'vitest'
import { editViewReducer } from './edit-view-reducer'
import type { EditViewAction } from './edit-view-actions'
import type { StructuredEcoreClass, StructuredEcorePropertyInfo } from '../types/structured-ecore-model'

const mockEcoreClass: StructuredEcoreClass = {
    id: 'type1',
    name: 'Type1',
    packageEntries: [],
    subTypes: [],
    superTypes: [],
    directSuperTypes: [],
    isPrimitive: false,
    canInstantiate: true,
    attributes: {},
    simpleReferences: {},
    containmentReferences: {},
    literals: undefined,
}

const mockPropertyInfo: StructuredEcorePropertyInfo = {
    id: 'attr1',
    name: 'Attribute1',
    type: { ...mockEcoreClass, id: 'EString', name: 'EString', isPrimitive: true },
    isArray: false,
    minItems: 0,
    maxItems: 1,
    uniqueItems: true,
    isInherited: false,
}

describe('editViewReducer', () => {
    it('should handle EDIT_ATTRIBUTE action successfully', () => {
        const initialState = {
            view: {
                id: 'view1',
                structuredResources: [
                    {
                        id: 'owner1',
                        type: mockEcoreClass,
                        attributes: [
                            { info: mockPropertyInfo, value: 'oldValue' },
                        ],
                        simpleReferences: [],
                        containmentReferences: [],
                        propertiesWithErrors: [],
                        parentId: undefined,
                        resourceSetInfo: undefined,
                    },
                ],
                ecoreModels: [],
            },
            success: false,
        }

        const action: EditViewAction = {
            type: 'EDIT_ATTRIBUTE',
            ownerId: 'owner1',
            attributeId: 'attr1',
            newValue: 'newValue',
            ignoreInputErrors: false,
        }

        const result = editViewReducer(initialState, action)

        expect(result.success).toBe(true)
        expect(
            result.view.structuredResources[0].attributes[0].value,
        ).toBe('newValue')
    })

    it('should handle EDIT_SIMPLE_REFERENCE action when newValue is undefined', () => {
        const initialState = {
            view: {
                id: 'view1',
                structuredResources: [
                    {
                        id: 'owner1',
                        type: mockEcoreClass,
                        attributes: [],
                        simpleReferences: [
                            {
                                info: { ...mockPropertyInfo, id: 'ref1', name: 'Reference1' },
                                value: { id: 'existingRef', type: { ...mockEcoreClass, id: 'type2' } } as any,
                            },
                        ],
                        containmentReferences: [],
                        propertiesWithErrors: [],
                        parentId: undefined,
                        resourceSetInfo: undefined,
                    },
                ],
                ecoreModels: [],
            },
            success: false,
        }

        const action: EditViewAction = {
            type: 'EDIT_SIMPLE_REFERENCE',
            ownerId: 'owner1',
            simpleReferenceId: 'ref1',
            newValue: undefined,
            ignoreInputErrors: true,
        }

        const result = editViewReducer(initialState, action)

        expect(result.success).toBe(true)
        expect(
            result.view.structuredResources[0].simpleReferences[0].value,
        ).toBeUndefined()
    })

    it('should handle ADD_CONTAINMENT_REFERENCE action properly', () => {
        const subType: StructuredEcoreClass = {
            ...mockEcoreClass,
            id: 'subType1',
            name: 'SubType1',
        }
        const initialState = {
            view: {
                id: 'view1',
                structuredResources: [
                    {
                        id: 'owner1',
                        type: mockEcoreClass,
                        attributes: [],
                        simpleReferences: [],
                        containmentReferences: [
                            {
                                info: {
                                    ...mockPropertyInfo,
                                    id: 'cref1',
                                    name: 'ContainmentRef1',
                                    type: {
                                        ...mockEcoreClass,
                                        subTypes: [subType],
                                    },
                                    isArray: true,
                                },
                                value: [],
                            },
                        ],
                        propertiesWithErrors: [],
                        parentId: undefined,
                        resourceSetInfo: undefined,
                    },
                ],
                ecoreModels: [],
            },
            success: false,
        }

        const action: EditViewAction = {
            type: 'ADD_CONTAINMENT_REFERENCE',
            ownerId: 'owner1',
            containmentReferenceId: 'cref1',
            dataTypeId: 'subType1',
            ignoreInputErrors: true,
        }

        const result = editViewReducer(initialState, action)

        expect(result.success).toBe(true)
        const containmentRef =
            result.view.structuredResources[0].containmentReferences[0]
        expect(containmentRef.value).toHaveLength(1)
        expect((containmentRef.value as any)[0].type.id).toBe('subType1')
        expect((containmentRef.value as any)[0].parentId).toBe('owner1')
    })

    it('should handle REMOVE_CONTAINMENT_REFERENCE action successfully', () => {
        const childId = 'child1'
        const initialState = {
            view: {
                id: 'view1',
                structuredResources: [
                    {
                        id: 'root1',
                        type: mockEcoreClass,
                        attributes: [],
                        simpleReferences: [],
                        containmentReferences: [
                            {
                                info: {
                                    ...mockPropertyInfo,
                                    id: 'cref1',
                                    name: 'ChildReference1',
                                    type: { ...mockEcoreClass, subTypes: [] },
                                    isArray: false,
                                },
                                value: {
                                    id: childId,
                                    type: { ...mockEcoreClass, id: 'type2', name: 'ChildType' },
                                    attributes: [],
                                    simpleReferences: [],
                                    containmentReferences: [],
                                    propertiesWithErrors: [],
                                    parentId: 'root1',
                                    resourceSetInfo: undefined,
                                } as any,
                            },
                        ],
                        propertiesWithErrors: [],
                        parentId: undefined,
                        resourceSetInfo: undefined,
                    },
                ],
                ecoreModels: [],
            },
            success: false,
        }

        const action: EditViewAction = {
            type: 'REMOVE_CONTAINMENT_REFERENCE',
            ownerId: 'root1',
            containmentReferenceId: childId,
            ignoreInputErrors: true,
        }

        const result = editViewReducer(initialState, action)

        expect(result.view.structuredResources[0].containmentReferences[0].value).toBeUndefined()
    })
})