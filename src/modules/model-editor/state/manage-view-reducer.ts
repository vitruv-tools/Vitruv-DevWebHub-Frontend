import { isNil, isNotNil } from '../../../common/utils/nil-utils.ts'
import { editViewReducer } from './edit-view-reducer.ts'
import type { ManageViewAction } from './manage-view-actions.ts'
import type { View } from '../types/structured-vitruvius-model.ts'
import { ResourcesApiToStructuredConverter } from '../converter/resources-api-to-structured-converter.ts'

type ReducerType = { view: View | undefined, success: boolean }

/**
 * Reducer function to manage the state of a view.
 *
 * @param {Object} param0 The current state and additional properties required for the reducer.
 * @param {ReducerType} param0.view The current view being managed.
 * @param {boolean} param0.success Indicates whether the previous operation was successful.
 * @param {ManageViewAction} action The action object containing the type of action and additional payload.
 * @return {ReducerType} The updated state after applying the specified action.
 */
export function manageViewReducer({ view, success }: ReducerType, action: ManageViewAction): ReducerType {
    switch (action.type) {
        case 'CLEAR_VIEW':
            return { view: undefined, success: true }

        case 'SET_VIEW': {

            const sortedEcoreModels = action.resourceSet.map(res => {
                const rootType = res.content.eClass

                const foundEcoreModel = action.ecoreModels.find(ecoreModel => isNotNil(ecoreModel[rootType]))
                if (isNil(foundEcoreModel)) {
                    throw new Error(`Could not find ecore model for root type ${rootType}`)
                }

                return foundEcoreModel
            })

            const structuredResources =
                new ResourcesApiToStructuredConverter().convert(action.resourceSet, sortedEcoreModels)

            return {
                view: {
                    id: action.id,
                    structuredResources,
                    ecoreModels: sortedEcoreModels,
                },
                success: true,
            }
        }

        case 'EDIT_VIEW': {
            if (isNil(view)) return { view, success: true }
            return editViewReducer({ view, success }, action.editViewAction)
        }
    }
}
