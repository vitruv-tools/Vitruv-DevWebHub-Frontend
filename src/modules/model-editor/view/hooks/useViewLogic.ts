import { useMemo, useReducer, useState } from 'react'
import type { StructuredResource } from '../../types/structured-resource.ts'
import type { VitruviusClient } from '../../infra/vitruvius-client.ts'
import type { EditViewAction } from '../../state/edit-view-actions.ts'
import { isNil } from '../../../../common/utils/nil-utils.ts'
import { manageViewReducer } from '../../state/manage-view-reducer.ts'
import type { View, Vsum } from '../../types/structured-vitruvius-model.ts'
import { getAllStructuredResources } from '../../helpers/structured-resource-helpers.ts'
import { useViewConfigCache } from './useViewConfigCache.ts'
import { useViewApi } from './useViewApi.ts'
import { useAsyncPropagation } from './useAsyncPropagation.ts'
import { ResourcesStructuredToApiConverter } from '../../converter/resources-structured-to-api-converter.ts'
import type { DeferredPropagation, PropagationUiState } from '../../types/api-propagation-task.ts'
import { isPropagationDeferredError } from '../../types/api-propagation-task.ts'

export type ViewLogic = {
    openView: (vsum: Vsum, selectorId: string, selectedObjectIds: string[]) => Promise<void>,
    closeView: () => Promise<void>,
    dispatchEditViewAction: (editViewAction: EditViewAction) => boolean,
    updateView: () => Promise<void>,
    view: View | undefined,
    allStructuredResources: StructuredResource[],
    hasChanges: boolean,
    propagationUiState: PropagationUiState,
    submitInteractionResponse: (responseJson: string) => void,
    deferPendingPropagation: () => Promise<DeferredPropagation | null>,
    unloadClientView: () => void,
    closeViewWithoutReload: () => Promise<void>,
}

/**
 * Responsible for managing the logic and state of a view, including opening, updating, closing views,
 * and handling user-driven edit actions.
 *
 * @param {VitruviusClient} client - The client instance used to interact with the Vitruvius API.
 * @return {ViewLogic} An object containing methods and state for managing the view:
 *   - `openView(vsum: Vsum, selectorId: string, selectedObjectIds: string[])`: Opens a new view with the specified parameters.
 *   - `updateView(): Promise<void>`: Updates the current view with any changes made and synchronizes with the server.
 *   - `closeView(): Promise<void>`: Closes the current view and clears related resources.
 *   - `dispatchEditViewAction(editViewAction: EditViewAction): boolean`: Dispatches an edit action to modify the view.
 *   - `view`: The current view object.
 *   - `allStructuredResources`: All structured resources associated with the current view.
 *   - `hasChanges`: A boolean indicating whether there are unsaved changes in the view.
 */
export function useViewLogic(client: VitruviusClient): ViewLogic {

    const viewApi = useViewApi(client)
    const asyncPropagation = useAsyncPropagation(client)
    const [{ view, success }, dispatch] = useReducer(manageViewReducer, { view: undefined, success: true })
    const allStructuredResources = useMemo(() => getAllStructuredResources(view?.structuredResources), [view])
    const [hasChanges, setHasChanges] = useState(false)

    const viewConfigCache = useViewConfigCache()

    async function openView(vsum: Vsum, selectorId: string, selectedObjectIds: string[]) {
        const ecoreModels = vsum.ecoreModels
        const { id, resourceSet } = await viewApi.openView(vsum.id, selectorId, selectedObjectIds)
        dispatch({ type: 'SET_VIEW', id, resourceSet, ecoreModels })
    }

    async function updateView(): Promise<void> {
        if (isNil(view)) {
            return
        }

        const resourceSet = new ResourcesStructuredToApiConverter().convert(view.structuredResources)

        try {
            let updatedResourceSet = await asyncPropagation.applyUpdateAsync(view.id, resourceSet)

            // Sometimes the update returns an empty resource set, although it is not empty.
            // This is known for the first update of a root resource if an attribute of the root resource is changed.
            // By reloading the page, a new view is opened automatically. This fixes the issue on the client side.
            if (Array.isArray(updatedResourceSet) && updatedResourceSet.length === 0) {
                location.reload()
                return
            }

            dispatch({ type: 'SET_VIEW', id: view.id, resourceSet: updatedResourceSet, ecoreModels: view.ecoreModels })
            setHasChanges(false)
        } catch (error) {
            if (isPropagationDeferredError(error)) {
                return
            }
            throw error
        }
    }

    async function closeView(): Promise<void> {
        if (isNil(view)) {
            return
        }
        await viewApi.closeView(view.id)
        viewConfigCache.clear()
        dispatch({ type: 'CLEAR_VIEW' })
        location.reload()
    }

    function unloadClientView(): void {
        dispatch({ type: 'CLEAR_VIEW' })
        setHasChanges(false)
    }

    async function closeViewWithoutReload(): Promise<void> {
        // Keep the server-side view alive so a parked propagation worker can still finish from the hub.
        viewConfigCache.clear()
        unloadClientView()
    }

    const dispatchEditViewAction = (editViewAction: EditViewAction) => {
        dispatch({ type: 'EDIT_VIEW', editViewAction })
        if (success) {
            setHasChanges(true)
            return true
        }
        return false
    }

    return {
        openView,
        closeView,
        dispatchEditViewAction,
        updateView,
        view,
        allStructuredResources,
        hasChanges,
        propagationUiState: asyncPropagation.uiState,
        submitInteractionResponse: asyncPropagation.submitInteractionResponse,
        deferPendingPropagation: asyncPropagation.deferPendingPropagation,
        unloadClientView,
        closeViewWithoutReload,
    }
}
