import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { VitruviusClient } from '../../infra/vitruvius-client.ts'
import type { VsumDto } from '../../types/api-vitruvius-model.ts'
import { useOpenView } from './useOpenView.ts'

const vsumApi = {
    loadMetamodels: vi.fn(),
    loadVsums: vi.fn(),
    loadViewTypes: vi.fn(),
    createSelector: vi.fn(),
    createVsum: vi.fn(),
}

vi.mock('./useVsumApi.ts', () => ({
    useVsumApi: () => vsumApi,
}))

const CACHE_KEY = 'cached-view-config'
const client = {} as VitruviusClient
const vsum: VsumDto = { id: 'vsum-1', metamodelName: 'mm', name: 'VSUM 1', description: '' }

function storeCache(value: unknown) {
    localStorage.setItem(CACHE_KEY, typeof value === 'string' ? value : JSON.stringify(value))
}

function renderOpenView(open: boolean, onSubmit = vi.fn()) {
    const hook = renderHook(({ open }) => useOpenView(client, onSubmit, open), {
        initialProps: { open },
    })
    return { ...hook, onSubmit }
}

describe('useOpenView', () => {
    beforeEach(() => {
        localStorage.clear()
        vsumApi.loadMetamodels.mockResolvedValue(['mm'])
        vsumApi.loadVsums.mockResolvedValue([vsum])
        vsumApi.loadViewTypes.mockResolvedValue(['TreeView'])
        vsumApi.createSelector.mockResolvedValue({
            id: 'selector-1',
            selectableObjects: [
                { _id: 'obj-1', eClass: 'Root' },
                { _id: 'obj-2', eClass: 'Entity' },
            ],
        })
    })

    afterEach(() => {
        vi.clearAllMocks()
        localStorage.clear()
    })

    it('shows the picker immediately and loads its data when opened without a cache', async () => {
        const { result } = renderOpenView(true)

        expect(result.current.mode).toBe('select')

        await waitFor(() => expect(result.current.vsums).toEqual([vsum]))
        expect(result.current.metamodels).toEqual(['mm'])
    })

    it('stays in loading mode and loads nothing while closed', () => {
        const { result } = renderOpenView(false)

        expect(result.current.mode).toBe('loading')
        expect(vsumApi.loadMetamodels).not.toHaveBeenCalled()
        expect(vsumApi.loadVsums).not.toHaveBeenCalled()
    })

    it('switches to the picker when it is opened later', async () => {
        const { result, rerender } = renderOpenView(false)

        rerender({ open: true })

        expect(result.current.mode).toBe('select')
        await waitFor(() => expect(result.current.vsums).toEqual([vsum]))
    })

    it('restores the cached view without showing the picker', async () => {
        storeCache({ vsumId: 'vsum-1', viewType: 'TreeView', selectedObjectsEClasses: ['Entity'] })

        const { result, onSubmit } = renderOpenView(true)

        expect(result.current.mode).toBe('loading')
        await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(vsum, 'selector-1', ['obj-2']))
        expect(result.current.mode).toBe('loading')
        expect(vsumApi.loadMetamodels).not.toHaveBeenCalled()
    })

    it('shows the loading state instead of the old picker when reopened with a cached view', async () => {
        const { result, rerender, onSubmit } = renderOpenView(true)
        await waitFor(() => expect(result.current.vsums).toEqual([vsum]))
        expect(result.current.mode).toBe('select')

        rerender({ open: false })
        storeCache({ vsumId: 'vsum-1', viewType: 'TreeView', selectedObjectsEClasses: ['Entity'] })
        rerender({ open: true })

        expect(result.current.mode).toBe('loading')
        await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(vsum, 'selector-1', ['obj-2']))
    })

    it('falls back to the picker and clears the cache when the cached VSUM is gone', async () => {
        storeCache({ vsumId: 'missing', viewType: 'TreeView', selectedObjectsEClasses: [] })

        const { result, onSubmit } = renderOpenView(true)

        await waitFor(() => expect(result.current.mode).toBe('select'))
        expect(onSubmit).not.toHaveBeenCalled()
        expect(localStorage.getItem(CACHE_KEY)).toBeNull()
    })

    it('treats a corrupt cache entry as no cache and clears it', async () => {
        storeCache('{not json')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

        const { result } = renderOpenView(true)

        expect(result.current.mode).toBe('select')
        await waitFor(() => expect(result.current.vsums).toEqual([vsum]))
        expect(localStorage.getItem(CACHE_KEY)).toBeNull()
        consoleError.mockRestore()
    })
})
