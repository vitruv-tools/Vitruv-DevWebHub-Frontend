/**
 * An interface for interacting with the VitruviusServer
 */
export interface VitruviusClient {
    request(url: string, options?: RequestInit): Promise<Response>
}
