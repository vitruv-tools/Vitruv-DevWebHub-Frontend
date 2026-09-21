import { isNil } from '../../../../common/utils/nil-utils.ts'
import type { SelectorDto, VsumDto } from '../../types/api-vitruvius-model.ts'
import type { VitruviusClient } from '../../infra/vitruvius-client.ts'
import { loadVitruvServerVsum } from './load-vitruv-server-vsum.ts'

/**
 * Provides a set of functions to interact with the Vitruvius API.
 *
 * @param {VitruviusClient} client - The client used to make API requests.
 * @return {Object} An object containing multiple methods:
 * - `loadMetamodels`: Fetches a list of available metamodels.
 * - `createVsum`: Creates a new visual summary (Vsum) for a given metamodel.
 * - `updateVsumInfo`: Updates the name and description of an existing Vsum.
 * - `deleteVsum`: Deletes a specified Vsum.
 * - `loadVsums`: Loads all existing Vsums, including the Vitruv server Vsum if applicable.
 * - `loadViewTypes`: Retrieves the view types associated with a given Vsum.
 * - `createSelector`: Creates a selector for a specified view type within a Vsum.
 */
export function useVsumApi(client: VitruviusClient) {
    async function loadMetamodels() {
        const response = await client.request('/v1/metamodels')
        const metamodels: string[] = await response.json()
        return metamodels
    }

    async function createVsum(metamodelName: string, name: string, description: string) {
        const response = await client.request('/v1/vsums', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ metamodelName, name, description }),
        })

        const vsum: VsumDto = await response.json()
        return vsum
    }

    async function updateVsumInfo(vsumId: string, name: string, description: string) {
        const response = await client.request(`/v1/vsums/${vsumId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description }),
        })

        const vsum: VsumDto = await response.json()
        return vsum
    }

    async function deleteVsum(vsumId: string) {
        await client.request(`/v1/vsums/${vsumId}`, { method: 'DELETE' })
    }

    async function loadVsums() {
        const response = await client.request('/v1/vsums')
        const vsums: VsumDto[] = await response.json()

        const vitruvServerVsum = await loadVitruvServerVsum(client)
        const allVsums = isNil(vitruvServerVsum) ? vsums : [vitruvServerVsum, ...vsums]

        return allVsums
    }

    async function loadViewTypes(vsumId: string) {
        const response = await client.request(`/v1/vsums/${vsumId}/view-types`)
        const viewTypeNames: string[] = await response.json()
        return viewTypeNames
    }

    async function createSelector(vsumId: string, viewTypeName: string) {
        const response = await client.request(
            `/v1/vsums/${vsumId}/view-types/${viewTypeName}/selectors`,
            { method: 'POST' },
        )
        const selector: SelectorDto = await response.json()

        return selector
    }


    return { loadMetamodels, createVsum, updateVsumInfo, deleteVsum, loadVsums, loadViewTypes, createSelector }
}