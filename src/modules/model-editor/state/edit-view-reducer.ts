import { produce } from 'immer'
import type { Property, StructuredResource } from '../types/structured-resource.ts'
import type { EditViewAction } from './edit-view-actions.ts'
import { randomString } from '../../../common/utils/string-utils.ts'
import { isNil, isNotNil } from '../../../common/utils/nil-utils.ts'
import { findStructuredResourceById, getAllStructuredResources } from '../helpers/structured-resource-helpers.ts'
import type { View } from '../types/structured-vitruvius-model.ts'
import { checkInput } from './input-checker/check-input.ts'
import { requireOwnerIsNotNil, requirePropertyIsNotNil } from './input-checker/helpers.ts'

type ReducerType = { view: View, success: boolean }

/**
 * Reducer function for handling various edit actions on a view's state.
 *
 * @param {ReducerType} state - The current state of the view.
 * @param {EditViewAction} action - The action to be processed, containing the operation type and associated data.
 * @return {ReducerType} The updated state after processing the action.
 */
export function editViewReducer(state: ReducerType, action: EditViewAction): ReducerType {
    return produce(state, (stateDraft) => {
        const view = stateDraft.view
        const draftRoots = view.structuredResources

        switch (action.type) {
            case 'EDIT_ATTRIBUTE': {
                const ownerRes = findStructuredResourceById(draftRoots, action.ownerId)
                requireOwnerIsNotNil(ownerRes, action.ownerId)

                const editAttr = ownerRes.attributes.find((attr) => attr.info.id === action.attributeId)
                requirePropertyIsNotNil(editAttr, action.attributeId, action.ownerId, 'attribute')

                const inputErrors = checkInput(editAttr.info, action.newValue)

                if (inputErrors.length === 0 || action.ignoreInputErrors) {
                    editAttr.value = action.newValue
                    stateDraft.success = true
                } else {
                    stateDraft.success = false
                }

                const allStructuredResources = getAllStructuredResources(draftRoots)
                if (inputErrors.length === 0) {
                    removePropertyWithError(ownerRes.id, editAttr, allStructuredResources)
                } else {
                    addPropertyWithError(ownerRes.id, editAttr, allStructuredResources)
                }

                editAttr.inputErrors = inputErrors
                return
            }

            case 'EDIT_SIMPLE_REFERENCE': {
                const ownerRes = findStructuredResourceById(draftRoots, action.ownerId)
                requireOwnerIsNotNil(ownerRes, action.ownerId)

                const editSref = ownerRes.simpleReferences.find((sref) => sref.info.id === action.simpleReferenceId)
                requirePropertyIsNotNil(editSref, action.simpleReferenceId, action.ownerId, 'simple reference')

                const inputErrors = checkInput(editSref.info, action.newValue)

                if (inputErrors.length === 0 || action.ignoreInputErrors) {

                    if (isNil(action.newValue)) {
                        editSref.value = undefined
                    } else if (Array.isArray(action.newValue)) {
                        editSref.value = action.newValue.map((id) => findStructuredResourceById(draftRoots, id)!)
                    } else {
                        editSref.value = findStructuredResourceById(draftRoots, action.newValue)
                    }
                    stateDraft.success = true
                } else {
                    stateDraft.success = false
                }

                const allStructuredResources = getAllStructuredResources(draftRoots)
                if (inputErrors.length === 0) {
                    removePropertyWithError(ownerRes.id, editSref, allStructuredResources)
                } else {
                    addPropertyWithError(ownerRes.id, editSref, allStructuredResources)
                }

                editSref.inputErrors = inputErrors
                return
            }

            case 'ADD_CONTAINMENT_REFERENCE': {
                const ownerRes = findStructuredResourceById(draftRoots, action.ownerId)
                requireOwnerIsNotNil(ownerRes, action.ownerId)

                const editCref = ownerRes.containmentReferences.find((cref) => cref.info.id === action.containmentReferenceId)
                requirePropertyIsNotNil(editCref, action.containmentReferenceId, action.ownerId, 'containment reference')

                const type = editCref.info.type.subTypes.find(it => it.id === action.dataTypeId)

                if (isNil(type)) {
                    throw new Error(`Could not find type ${action.dataTypeId} for containment reference ${editCref.info.id}`)
                }

                const newChild: StructuredResource = {
                    id: randomString(64),
                    type,
                    attributes: Object.values(type.attributes).map(attrInfo => ({
                        info: attrInfo,
                        value: undefined,
                    })),
                    simpleReferences: Object.values(type.simpleReferences).map(srefInfo => ({
                        info: srefInfo,
                        value: undefined,
                    })),
                    containmentReferences: Object.values(type.containmentReferences).map(crefInfo => ({
                        info: crefInfo,
                        value: undefined,
                    })),
                    resourceSetInfo: undefined,
                    propertiesWithErrors: [],
                    parentId: ownerRes.id,
                }

                let newValue = undefined
                if (isNil(editCref.value)) {
                    if (editCref.info.isArray) {
                        newValue = [newChild]
                    } else {
                        newValue = newChild
                    }
                } else if (Array.isArray(editCref.value)) {
                    newValue = [...editCref.value, newChild]
                } else {
                    newValue = newChild
                }

                const inputErrors = checkInput(editCref.info, newValue)

                if (inputErrors.length === 0 || action.ignoreInputErrors) {
                    editCref.value = newValue
                    stateDraft.success = true
                } else {
                    stateDraft.success = false
                }

                const allStructuredResources = getAllStructuredResources(draftRoots)
                if (inputErrors.length === 0) {
                    removePropertyWithError(ownerRes.id, editCref, allStructuredResources)
                } else {
                    addPropertyWithError(ownerRes.id, editCref, allStructuredResources)
                }

                editCref.inputErrors = inputErrors

                return
            }

            case 'REMOVE_CONTAINMENT_REFERENCE': {
                removeByIdFromRoots(draftRoots, action.containmentReferenceId)
                return
            }
        }
    })
}


function removeByIdFromRoots(roots: StructuredResource[], childId: string): boolean {
    for (const root of roots) {
        if (removeById(root, childId)) return true
    }
    return false
}

function removeById(node: StructuredResource, childId: string): boolean {
    for (const cref of node.containmentReferences) {
        const v = cref.value
        if (!v) continue

        if (Array.isArray(v)) {
            const idx = v.findIndex((c) => c.id === childId)
            if (idx >= 0) {
                const nextLen = v.length - 1
                if (nextLen < cref.info.minItems) return true // found but not removed
                v.splice(idx, 1)
                if (v.length === 0 && cref.info.minItems === 0) cref.value = undefined
                return true
            }

            for (const child of v) {
                if (removeById(child, childId)) return true
            }
        } else {
            if (v.id === childId) {
                if (cref.info.minItems > 0) return true // found but not removed
                cref.value = undefined
                return true
            }

            if (removeById(v, childId)) return true
        }
    }

    return false
}

function addPropertyWithError(resId: string | undefined, property: Property<unknown>, allRes: StructuredResource[]) {
    if (isNotNil(resId)) {
        const res = allRes.find(it => it.id === resId)!

        if (!res.propertiesWithErrors.includes(property.info.id)) {
            res.propertiesWithErrors = [...res.propertiesWithErrors, property.info.id]
        }
        addPropertyWithError(res.parentId, property, allRes)
    }
}

function removePropertyWithError(resId: string | undefined, property: Property<unknown>, allRes: StructuredResource[]) {
    if (isNotNil(resId)) {
        const res = allRes.find(it => it.id === resId)!
        res.propertiesWithErrors = res.propertiesWithErrors.filter(it => it !== property.info.id)
        removePropertyWithError(res.parentId, property, allRes)
    }
}