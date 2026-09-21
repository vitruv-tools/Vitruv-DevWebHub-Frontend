import type { VitruviusClient } from './vitruvius-client.ts'

/**
 * Implementation of the VitruviusClient interface. Manages HTTP requests to a specified base URL and provides
 * error handling capabilities via a user-defined error callback.
 */
export class VitruviusClientImpl implements VitruviusClient {
    constructor(
        private readonly baseUrl: string,
        private readonly onError: (message: string) => void,
    ) {
    }

    async request(url: string, options?: RequestInit): Promise<Response> {
        try {
            const response = await fetch(this.baseUrl + url, options)

            if (response.status >= 400) {
                const message = await response.text()
                throw new Error(message)
            }

            return response
        } catch (e) {
            const message = e instanceof Error ? e.message : String(e)
            this.onError(message)
            throw e
        }
    }
}
