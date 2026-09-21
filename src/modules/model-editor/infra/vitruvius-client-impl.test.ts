import { describe, it, expect, vi, beforeEach } from 'vitest'
import { VitruviusClientImpl } from './vitruvius-client-impl'

const BASE_URL = 'https://api.example.com'

describe('VitruviusClientImpl', () => {
    let onError: ReturnType<typeof vi.fn>
    let client: VitruviusClientImpl

    beforeEach(() => {
        onError = vi.fn()
        // @ts-ignore
        client = new VitruviusClientImpl(BASE_URL, onError)
        vi.resetAllMocks()
    })

    it('returns the response on success', async () => {
        const mockResponse = new Response('ok', { status: 200 })
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse))

        const result = await client.request('/test', { method: 'GET' })

        expect(fetch).toHaveBeenCalledWith(BASE_URL + '/test', { method: 'GET' })
        expect(result).toBe(mockResponse)
        expect(onError).not.toHaveBeenCalled()
    })

    it('calls onError and rethrows the original error on HTTP error status', async () => {
        const mockResponse = new Response('Bad Request', { status: 400 })
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse))

        await expect(client.request('/bad')).rejects.toThrow('Bad Request')
        expect(onError).toHaveBeenCalledWith('Bad Request')
    })

    it('calls onError and rethrows the original error on network failure', async () => {
        const networkError = new Error('Failed to fetch')
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(networkError))

        await expect(client.request('/offline')).rejects.toBe(networkError)
        expect(onError).toHaveBeenCalledWith('Failed to fetch')
    })

    it('converts non-Error throws to string when calling onError', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue('unexpected'))

        await expect(client.request('/weird')).rejects.toBe('unexpected')
        expect(onError).toHaveBeenCalledWith('unexpected')
    })
})