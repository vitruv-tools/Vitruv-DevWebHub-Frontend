import { describe, expect, it, vi } from 'vitest'
import { manageViewReducer } from './manage-view-reducer'
import type { ManageViewAction } from './manage-view-actions'
import { editViewReducer } from './edit-view-reducer'
import { ResourcesApiToStructuredConverter } from '../converter/resources-api-to-structured-converter'

vi.mock('../converter/resources-api-to-structured-converter', () => {
    const ResourcesApiToStructuredConverter = vi.fn()
    ResourcesApiToStructuredConverter.prototype.convert = vi.fn()
    return { ResourcesApiToStructuredConverter }
})

vi.mock('./edit-view-reducer', () => ({
    editViewReducer: vi.fn(),
}))

describe('manageViewReducer', () => {
    it('should handle the CLEAR_VIEW action', () => {
        const initialState = { view: { id: '1', structuredResources: [], ecoreModels: [] }, success: false }
        const action: ManageViewAction = { type: 'CLEAR_VIEW' }

        const result = manageViewReducer(initialState, action)

        expect(result).toEqual({ view: undefined, success: true })
    })

    it('should handle the SET_VIEW action with valid data', () => {
        const initialState = { view: undefined, success: false }
        const action: ManageViewAction = {
            type: 'SET_VIEW',
            id: '2',
            resourceSet: [{ content: { eClass: 'RootType1' } }],
            ecoreModels: [{ RootType1: {} as any }],
        }

        const mockConvert = vi.mocked(ResourcesApiToStructuredConverter.prototype.convert)
        mockConvert.mockReturnValue('mockedStructuredResources' as any)

        const result = manageViewReducer(initialState, action)

        expect(result).toEqual({
            view: {
                id: '2',
                structuredResources: 'mockedStructuredResources',
                ecoreModels: (action as any).ecoreModels,
            },
            success: true,
        })
        expect(mockConvert).toHaveBeenCalledWith((action as any).resourceSet, (action as any).ecoreModels)
    })

    it('should handle the SET_VIEW action with missing ecore model', () => {
        const initialState = { view: undefined, success: false }
        const action: ManageViewAction = {
            type: 'SET_VIEW',
            id: '3',
            resourceSet: [{ content: { eClass: 'MissingRootType' } }],
            ecoreModels: [{ RootType1: {} as any }],
        }

        expect(() => manageViewReducer(initialState, action)).toThrow(
            'Could not find ecore model for root type MissingRootType',
        )
    })

    it('should handle the SET_VIEW action with multiple resources', () => {
        const initialState = { view: undefined, success: false }
        const action: ManageViewAction = {
            type: 'SET_VIEW',
            id: '4',
            resourceSet: [
                { content: { eClass: 'Type1' } },
                { content: { eClass: 'Type2' } },
            ],
            ecoreModels: [
                { Type2: {} as any },
                { Type1: {} as any },
            ],
        }

        const mockConvert = vi.mocked(ResourcesApiToStructuredConverter.prototype.convert)
        mockConvert.mockReturnValue('mockedStructuredResources' as any)

        const result = manageViewReducer(initialState, action)

        expect(result.view?.ecoreModels).toEqual([
            (action as any).ecoreModels[1], // Type1
            (action as any).ecoreModels[0], // Type2
        ])
        expect(result.success).toBe(true)
    })

    it('should handle the EDIT_VIEW action when no view exists', () => {
        const initialState = { view: undefined, success: false }
        const action: ManageViewAction = {
            type: 'EDIT_VIEW',
            editViewAction: {
                type: 'EDIT_ATTRIBUTE',
                ownerId: '1',
                attributeId: 'attr1',
                newValue: 'newValue',
                ignoreInputErrors: false,
            },
        }

        const result = manageViewReducer(initialState, action)

        expect(result).toEqual({ view: undefined, success: true })
    })

    it('should delegate EDIT_VIEW action to editViewReducer when a view exists', () => {
        const initialState = {
            view: { id: '1', structuredResources: [], ecoreModels: [] },
            success: false,
        }
        const action: ManageViewAction = {
            type: 'EDIT_VIEW',
            editViewAction: {
                type: 'EDIT_ATTRIBUTE',
                ownerId: '2',
                attributeId: 'attr2',
                newValue: 'newValue',
                ignoreInputErrors: false,
            },
        }

        const mockEditViewReducer = vi.mocked(editViewReducer)
        mockEditViewReducer.mockReturnValue({ view: initialState.view, success: true })

        const result = manageViewReducer(initialState, action)

        expect(mockEditViewReducer).toHaveBeenCalledWith(initialState, (action as any).editViewAction)
        expect(result).toEqual({ view: initialState.view, success: true })
    })
})