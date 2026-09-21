import type { VitruviusClient } from '../../infra/vitruvius-client.ts'

/**
 * Provides methods to interact with the View API using the provided VitruviusClient.
 *
 * @param {VitruviusClient} client - The client instance used to send requests to the View API.
 * @return {object} An object containing methods to manage views: `openView`, `commit`, `update`, and `closeView`.
 *   - `openView(vsumId, selectorId, selectedObjectIds)`:
 *     Opens a new view.
 *   - `commit(viewId, resourceSet)`:
 *     Commits changes to the specified view.
 *   - `update(viewId)`:
 *     Applies updates of the specified view and returns the updated resource set.
 *   - `closeView(viewId)`:
 *     Closes the specified view.
 */
export function useViewApi(client: VitruviusClient) {
    async function openView(vsumId: string, selectorId: string, selectedObjectIds: string[]) {
        const response = await client.request('/v1/views', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vsumId, selectorId, selectedObjectIds }),
        })

        const responseBody: { id: string, resourceSet: any } = await response.json()
        return responseBody
    }

    async function commit(viewId: string, resourceSet: any) {
        await client.request(`/v1/views/${viewId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(resourceSet),
        })
    }

    async function update(viewId: string) {
        const response = await client.request(`/v1/views/${viewId}/apply-update`, { method: 'POST' })
        const updatedResourceSet = await response.json()
        return updatedResourceSet
    }

    async function closeView(viewId: string) {
        await client.request(`/v1/views/${viewId}`, { method: 'DELETE' })
    }

    return { openView, commit, update, closeView }
}