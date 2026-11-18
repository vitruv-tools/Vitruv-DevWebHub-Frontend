import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useAsyncData } from './useAsyncData.ts'

function deferred<T>() {
    let resolve!: (value: T) => void
    let reject!: (error: unknown) => void
    const promise = new Promise<T>((res, rej) => {
        resolve = res
        reject = rej
    })
    return { promise, resolve, reject }
}

describe('useAsyncData', () => {
    it('starts loading and then exposes the loaded data', async () => {
        const { result } = renderHook(() => useAsyncData(() => Promise.resolve('data'), [], ''))

        expect(result.current.loading).toBe(true)
        await waitFor(() => expect(result.current.loading).toBe(false))
        expect(result.current.data).toBe('data')
        expect(result.current.error).toBeNull()
    })

    it('exposes and reports load errors', async () => {
        const onError = vi.fn()
        const { result } = renderHook(() =>
            useAsyncData(() => Promise.reject(new Error('Server down')), [], '', { onError }),
        )

        await waitFor(() => expect(result.current.loading).toBe(false))
        expect(result.current.error).toBe('Server down')
        expect(onError).toHaveBeenCalledExactlyOnceWith('Server down')
    })

    it('resets the data and loads again when a dependency changes, ignoring stale responses', async () => {
        const responses = { a: deferred<string>(), b: deferred<string>() }
        const { result, rerender } = renderHook(
            ({ id }: { id: 'a' | 'b' }) => useAsyncData(() => responses[id].promise, [id], 'none'),
            { initialProps: { id: 'a' } },
        )
        await act(async () => responses.a.resolve('data a'))
        expect(result.current.data).toBe('data a')

        responses.a = deferred<string>()
        rerender({ id: 'b' })
        expect(result.current.loading).toBe(true)
        expect(result.current.data).toBe('none')

        rerender({ id: 'a' })
        await act(async () => responses.b.resolve('stale b'))
        expect(result.current.data).toBe('none')
        expect(result.current.loading).toBe(true)

        await act(async () => responses.a.resolve('fresh a'))
        expect(result.current.data).toBe('fresh a')
        expect(result.current.loading).toBe(false)
    })

    it('keeps the previous data while loading when keepPreviousData is set', async () => {
        const { result, rerender } = renderHook(
            ({ id }: { id: string }) =>
                useAsyncData(() => new Promise<string>(() => {}), [id], 'none', {
                    keepPreviousData: true,
                }),
            { initialProps: { id: 'a' } },
        )
        expect(result.current.data).toBe('none')

        rerender({ id: 'b' })

        expect(result.current.loading).toBe(true)
        expect(result.current.data).toBe('none')
    })

    it('reloads with the latest inputs and ignores the response of an earlier request', async () => {
        const first = deferred<string>()
        const second = deferred<string>()
        const load = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
        const { result } = renderHook(() => useAsyncData(load, [], ''))

        act(() => result.current.reload())
        expect(load).toHaveBeenCalledTimes(2)

        await act(async () => second.resolve('second'))
        await act(async () => first.resolve('first'))

        expect(result.current.data).toBe('second')
        expect(result.current.loading).toBe(false)
    })

    it('clears the previous error when reloading', async () => {
        const load = vi
            .fn()
            .mockRejectedValueOnce(new Error('Server down'))
            .mockReturnValueOnce(new Promise(() => {}))
        const { result } = renderHook(() => useAsyncData(load, [], ''))
        await waitFor(() => expect(result.current.error).toBe('Server down'))

        act(() => result.current.reload())

        expect(result.current.error).toBeNull()
        expect(result.current.loading).toBe(true)
    })
})
