import type { SelectableObjectDto, SelectorDto, VsumDto } from '../../types/api-vitruvius-model.ts'
import { useEffect, useEffectEvent, useMemo, useState } from 'react'
import type { VitruviusClient } from '../../infra/vitruvius-client.ts'
import { useVsumApi } from './useVsumApi.ts'
import { useViewConfigCache } from './useViewConfigCache.ts'
import { isNil, isNotNil } from '../../../../common/utils/nil-utils.ts'
import { useOnChange } from '../../../../common/hooks/useOnChange.ts'

export type OpenViewLogic = {
    mode: 'loading' | 'select'
    metamodels: string[]
    vsums: VsumDto[]
    selectVsum: (vsumId: string) => Promise<void>
    selectedVsum: VsumDto | undefined
    createVsum: (metamodel: string, name: string, description: string) => Promise<void>
    viewTypes: string[]
    selectedViewType: string | undefined
    selectViewType: (vsumId: string, viewType: string) => Promise<void>
    selectableObjects: SelectableObjectDto[]
    openView: (selectedObjectIds: string[]) => void
    openViewFromCache: () => Promise<void>
}

/**
 * Handles logic for opening and configuring a view, including loading metamodels, vsums, view types, and managing cache.
 *
 * @param {VitruviusClient} client - The client instance used for API calls to fetch or create vsums, metamodels, and view types.
 * @param {(vsum: VsumDto, selectorId: string, selectedObjectIds: string[]) => void} onSubmit - Callback executed when a view is opened successfully. Provides the selected vsum, selector ID, and selected object IDs.
 * @return {OpenViewLogic} Returns an object containing the application state and various utility methods for managing the view-opening process.
 */
export function useOpenView(
    client: VitruviusClient,
    onSubmit: (vsum: VsumDto, selectorId: string, selectedObjectIds: string[]) => void,
    open: boolean,
): OpenViewLogic {
    const vsumApi = useVsumApi(client)
    const viewConfigCache = useViewConfigCache()

    // Without a cached view config there is nothing to restore, so the picker can be shown right away.
    // A corrupt cache entry counts as "no cache"; the bootstrap effect clears it.
    const shouldShowPicker = () => {
        if (!open) {
            return false
        }
        try {
            return isNil(viewConfigCache.load())
        } catch {
            return true
        }
    }
    const [mode, setMode] = useState<'loading' | 'select'>(() =>
        shouldShowPicker() ? 'select' : 'loading',
    )
    // On each opening, show the picker or, while a cached view is restored, the loading state.
    useOnChange([open], () => {
        if (open) {
            setMode(shouldShowPicker() ? 'select' : 'loading')
        }
    })

    const [metamodels, setMetamodels] = useState<string[]>([])
    const [vsums, setVsums] = useState<VsumDto[]>([])
    const [viewTypes, setViewTypes] = useState<string[]>([])
    const [selector, setSelector] = useState<SelectorDto>()

    const [selectedVsumId, setSelectedVsumId] = useState<string>()
    const selectedVsum = useMemo(
        () => vsums.find((it) => it.id === selectedVsumId),
        [vsums, selectedVsumId],
    )
    const [selectedViewType, setSelectedViewType] = useState<string>()
    const selectableObjects = useMemo(
        () => selector?.selectableObjects ?? [],
        [selector?.selectableObjects],
    )
    /* ----------------------- Selection ----------------------- */

    async function selectVsum(vsumId: string) {
        setSelectedVsumId(vsumId)
        setSelectedViewType(undefined)
        setSelector(undefined)

        const viewTypes = await vsumApi.loadViewTypes(vsumId)
        setViewTypes(viewTypes)
    }

    async function selectViewType(vsumId: string, viewType: string) {
        setSelectedViewType(viewType)
        setSelector(undefined)

        const selector = await vsumApi.createSelector(vsumId, viewType)
        setSelector(selector)
    }

    function openView(selectedObjectIds: string[]) {
        if (isNil(selectedVsum) || isNil(selectedViewType) || isNil(selector)) {
            return
        }

        const selectedObjectsEClasses = selectedObjectIds
            .map(
                (it) =>
                    selector.selectableObjects.find((selectable) => selectable._id === it)?.eClass,
            )
            .filter(isNotNil)

        if (selectedObjectsEClasses.length !== selectedObjectIds.length) {
            throw new Error('Could not find all selected objects')
        }

        viewConfigCache.store({
            vsumId: selectedVsum.id,
            viewType: selectedViewType,
            selectedObjectsEClasses,
        })

        onSubmit(selectedVsum, selector.id, selectedObjectIds)
        clear()
    }

    /* ----------------------- Cache ----------------------- */

    async function openViewFromCache() {
        try {
            const cache = viewConfigCache.load()
            if (isNil(cache)) {
                setMode('select')
                return
            }

            const vsums = await vsumApi.loadVsums()
            const vsum = vsums.find((it) => it.id === cache.vsumId)
            if (isNil(vsum)) {
                viewConfigCache.clear()
                setMode('select')
                return
            }

            const viewTypes = await vsumApi.loadViewTypes(vsum.id)
            const viewType = viewTypes.find((it) => it === cache.viewType)
            if (isNil(viewType)) {
                viewConfigCache.clear()
                setMode('select')
                return
            }

            const selector = await vsumApi.createSelector(vsum.id, viewType)
            const selectedObjectsIds = cache.selectedObjectsEClasses
                .map((eClass) => selector.selectableObjects.find((it) => it.eClass === eClass)?._id)
                .filter(isNotNil)

            if (selectedObjectsIds.length !== cache.selectedObjectsEClasses.length) {
                viewConfigCache.clear()
                setMode('select')
                return
            }

            onSubmit(vsum, selector.id, selectedObjectsIds)
            clear()
        } catch (error) {
            console.error('Failed to restore cached view:', error)
            viewConfigCache.clear()
            setMode('select')
        }
    }

    /* ----------------------- Clear ----------------------- */

    function clear() {
        setSelectedVsumId(undefined)
        setSelectedViewType(undefined)
        setSelector(undefined)
    }

    /* ----------------------- Preparation ----------------------- */
    async function loadMetamodels() {
        const metamodels = await vsumApi.loadMetamodels()
        setMetamodels(metamodels)
    }

    async function loadVsums() {
        const vsums = await vsumApi.loadVsums()
        setVsums(vsums)
    }

    async function createVsum(metamodel: string, name: string, description: string) {
        const vsum = await vsumApi.createVsum(metamodel, name, description)

        await loadVsums()
        await selectVsum(vsum.id)
    }

    // An effect event always sees the latest helpers without making the effect re-run on every render.
    const bootstrap = useEffectEvent(async (isCancelled: () => boolean) => {
        try {
            const cache = viewConfigCache.load()
            if (isNotNil(cache)) {
                await openViewFromCache()
                return
            }
            if (isCancelled()) {
                return
            }
            await loadMetamodels()
            if (isCancelled()) {
                return
            }
            await loadVsums()
        } catch (error) {
            console.error('Failed to open VSUM picker:', error)
            viewConfigCache.clear()
            if (!isCancelled()) {
                setMode('select')
                try {
                    await loadMetamodels()
                    await loadVsums()
                } catch {
                    // keep select mode with whatever loaded
                }
            }
        }
    })

    useEffect(() => {
        if (!open) {
            return
        }

        let cancelled = false
        // bootstrap only updates state after awaiting the API, and the picker mode for the
        // no-cache case is already set during render, so there are no cascading renders here.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void bootstrap(() => cancelled)
        return () => {
            cancelled = true
        }
    }, [open])

    return {
        mode,
        metamodels,
        vsums,
        selectVsum,
        selectedVsum,
        createVsum,
        viewTypes,
        selectViewType,
        selectedViewType,
        selectableObjects,
        openView,
        openViewFromCache,
    }
}
