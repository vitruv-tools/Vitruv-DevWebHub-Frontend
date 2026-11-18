import { useCallback, useEffect, useEffectEvent, useState } from 'react'
import { useOnChange } from './useOnChange.ts'

export type AsyncData<T> = {
    data: T
    loading: boolean
    error: string | null
    /** Loads again with the current inputs. Any response still pending is ignored. */
    reload: () => void
}

export type AsyncDataOptions = {
    /** Keep showing the previous data while new inputs load instead of resetting it. */
    keepPreviousData?: boolean
    /** Called with the error message when a load fails. */
    onError?: (message: string) => void
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error)
}

/**
 * Loads data with `load` and loads it again whenever one of `deps` changes or `reload` is called.
 *
 * Only the most recent request may update the state: a response that arrives after the inputs
 * changed, or after a newer reload started, is ignored. `loading` switches to true in the same
 * render the inputs change, so stale data is never shown as current.
 *
 * `load` always sees the latest props and state; `deps` decides when it runs.
 */
export function useAsyncData<T>(
    load: () => Promise<T>,
    deps: readonly unknown[],
    initialData: T,
    options: AsyncDataOptions = {},
): AsyncData<T> {
    const { keepPreviousData = false, onError } = options
    const [data, setData] = useState(initialData)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [request, setRequest] = useState(0)

    useOnChange(deps, () => {
        if (!keepPreviousData) {
            setData(initialData)
        }
        setLoading(true)
        setError(null)
        setRequest((current) => current + 1)
    })

    const reload = useCallback(() => {
        setLoading(true)
        setError(null)
        setRequest((current) => current + 1)
    }, [])

    const runLoad = useEffectEvent(load)
    const reportError = useEffectEvent((message: string) => onError?.(message))

    useEffect(() => {
        let ignore = false
        runLoad()
            .then((result) => {
                if (!ignore) setData(result)
            })
            .catch((err: unknown) => {
                if (ignore) return
                const message = errorMessage(err)
                setError(message)
                reportError(message)
            })
            .finally(() => {
                if (!ignore) setLoading(false)
            })
        return () => {
            ignore = true
        }
    }, [request])

    return { data, loading, error, reload }
}
