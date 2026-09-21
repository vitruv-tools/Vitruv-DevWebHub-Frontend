import type { VsumDto } from '../../types/api-vitruvius-model.ts'
import type { VitruviusClient } from '../../infra/vitruvius-client.ts'
import { stringAsBoolean } from '../../../../common/utils/string-utils.ts'

/**
 * Loads the VitruvServerVsum data from the Vitruvius server using the provided client.
 *
 * @param {VitruviusClient} client - The client used to make requests to the Vitruvius server.
 * @return {Promise<VsumDto | undefined>} A promise that resolves to the VsumDto object if the server is available, or `undefined` if the server is unavailable or an error occurs.
 */
export async function loadVitruvServerVsum(client: VitruviusClient) {

    const vsumId = '00000000-0000-0000-0000-000000000001'
    const vsumName = 'VitruvServerVsum'
    const metamodelName = 'VitruvServerVsum'
    const description = ''

    const vsum: VsumDto = {
        id: vsumId,
        metamodelName,
        name: vsumName,
        description,
    }

    try {
        const response = await client.request('/v1/vitruv-server')
        if (response.status !== 200) {
            return undefined
        }
        const body = await response.json()
        if (!stringAsBoolean(body.isAvailable, false)) {
            return undefined
        }
        return vsum
    } catch {
        return undefined
    }
}