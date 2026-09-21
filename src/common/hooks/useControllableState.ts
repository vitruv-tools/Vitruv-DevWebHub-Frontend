import { useState } from 'react'

/**
 * Hook to manage a state that can either be controlled externally or used as internal state
 * with a default value.
 *
 * @template T - The type of the state.
 * @param {Object} params - Configuration object for the controllable state.
 * @param {T} [params.value] - The externally controlled value. If provided, the state is controlled.
 * @param {T} params.defaultValue - The initial value for the uncontrolled state.
 * @param {(value: T) => void} [params.onChange] - Callback invoked when the state changes.
 * @return {[T, (value: T | ((prev: T) => T)) => void]} Returns a tuple of the current state and
 * a function to update the state. If the state is controlled, updates only trigger the `onChange` callback.
 */
export function useControllableState<T>(params: {
    value?: T
    defaultValue: T
    onChange?: (value: T) => void
}): [T, (value: T | ((prev: T) => T)) => void] {
    const { value, defaultValue, onChange } = params
    const [internal, setInternal] = useState<T>(defaultValue)

    const isControlled = value !== undefined
    const state = isControlled ? (value as T) : internal

    function setState(next: T | ((prev: T) => T)) {
        const nextValue = typeof next === 'function' ? (next as (p: T) => T)(state) : next
        if (!isControlled) setInternal(nextValue)
        onChange?.(nextValue)
    }

    return [state, setState] as const
}
