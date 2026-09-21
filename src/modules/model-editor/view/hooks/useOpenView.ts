import type { SelectableObjectDto, SelectorDto, VsumDto } from '../../types/api-vitruvius-model.ts'
import { useEffect, useMemo, useState } from 'react'
import type { VitruviusClient } from '../../infra/vitruvius-client.ts'
import { useVsumApi } from './useVsumApi.ts'
import { useViewConfigCache } from './useViewConfigCache.ts'
import { isNil, isNotNil } from '../../../../common/utils/nil-utils.ts'

export type OpenViewLogic = {
    mode: 'loading' | 'select',
    metamodels: string[],
    vsums: VsumDto[],
    selectVsum: (vsumId: string) => Promise<void>,
    selectedVsum: VsumDto | undefined,
    createVsum: (metamodel: string, name: string, description: string) => Promise<void>,
    viewTypes: string[],
    selectedViewType: string | undefined,
    selectViewType: (vsumId: string, viewType: string) => Promise<void>,
    selectableObjects: SelectableObjectDto[],
    openView: (selectedObjectIds: string[]) => void,
    openViewFromCache: () => Promise<void>,
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

    const [mode, setMode] = useState<'loading' | 'select'>('loading')

    const vsumApi = useVsumApi(client)
    const viewConfigCache = useViewConfigCache()

    const [metamodels, setMetamodels] = useState<string[]>([])
    const [vsums, setVsums] = useState<VsumDto[]>([])
    const [viewTypes, setViewTypes] = useState<string[]>([])
    const [selector, setSelector] = useState<SelectorDto>()

    const [selectedVsumId, setSelectedVsumId] = useState<string>()
    const selectedVsum = useMemo(() => vsums.find(it => it.id === selectedVsumId), [vsums, selectedVsumId])
    const [selectedViewType, setSelectedViewType] = useState<string>()
    const selectableObjects = useMemo(() => selector?.selectableObjects ?? [], [selector?.selectableObjects])

    /* ----------------------- Preparation ----------------------- */

    useEffect(() => {
        if (!open) {
            return
        }

        let cancelled = false

        async function bootstrap() {
            try {
                const cache = viewConfigCache.load()
                if (isNotNil(cache)) {
                    await openViewFromCache()
                    return
                }
                if (cancelled) {
                    return
                }
                setMode('select')
                await loadMetamodels()
                if (cancelled) {
                    return
                }
                await loadVsums()
            } catch (error) {
                console.error('Failed to open VSUM picker:', error)
                viewConfigCache.clear()
                if (!cancelled) {
                    setMode('select')
                    try {
                        await loadMetamodels()
                        await loadVsums()
                    } catch {
                        // keep select mode with whatever loaded
                    }
                }
            }
        }

        void bootstrap()
        return () => {
            cancelled = true
        }
    }, [open])

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

        const selectedObjectsEClasses =
            selectedObjectIds
                .map(it => selector.selectableObjects.find(selectable => selectable._id === it)?.eClass)
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
            const vsum = vsums.find(it => it.id === cache.vsumId)
            if (isNil(vsum)) {
                viewConfigCache.clear()
                setMode('select')
                return
            }

            const viewTypes = await vsumApi.loadViewTypes(vsum.id)
            const viewType = viewTypes.find(it => it === cache.viewType)
            if (isNil(viewType)) {
                viewConfigCache.clear()
                setMode('select')
                return
            }

            const selector = await vsumApi.createSelector(vsum.id, viewType)
            const selectedObjectsIds = cache.selectedObjectsEClasses
                .map(eClass =>
                    selector.selectableObjects.find(it => it.eClass === eClass)?._id,
                )
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