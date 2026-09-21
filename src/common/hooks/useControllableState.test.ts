import { act, renderHook } from '@testing-library/react'
import { useControllableState } from './useControllableState'
import { describe, expect, it, vi } from 'vitest'

describe('useControllableState', () => {
    it('should use the default value when no controlled value is provided', () => {
        const { result } = renderHook(() =>
            useControllableState({ defaultValue: 'default' }),
        )

        const [state] = result.current
        expect(state).toBe('default')
    })

    it('should update internal state when uncontrolled', () => {
        const { result } = renderHook(() =>
            useControllableState({ defaultValue: 'default' }),
        )

        const [, setState] = result.current

        act(() => setState('updated'))
        const [state] = result.current
        expect(state).toBe('updated')
    })

    it('should call onChange callback when state changes', () => {
        const onChange = vi.fn()
        const { result } = renderHook(() =>
            useControllableState({ defaultValue: 'default', onChange }),
        )

        const [, setState] = result.current

        act(() => setState('updated'))
        expect(onChange).toHaveBeenCalledWith('updated')
    })

    it('should use the controlled value when provided', () => {
        const { result } = renderHook(() =>
            useControllableState({ value: 'controlled', defaultValue: 'default' }),
        )

        const [state] = result.current
        expect(state).toBe('controlled')
    })

    it('should call onChange but not update internal state when controlled', () => {
        const onChange = vi.fn()
        const { result } = renderHook(() =>
            useControllableState({ value: 'controlled', defaultValue: 'default', onChange }),
        )

        const [, setState] = result.current

        act(() => setState('updated'))
        const [state] = result.current
        expect(state).toBe('controlled')
        expect(onChange).toHaveBeenCalledWith('updated')
    })

    it('should handle functional updates correctly in uncontrolled state', () => {
        const { result } = renderHook(() =>
            useControllableState({ defaultValue: 1 }),
        )

        const [, setState] = result.current

        act(() => setState((prev) => prev + 1))
        const [state] = result.current
        expect(state).toBe(2)
    })

    it('should handle functional updates correctly in controlled state', () => {
        const onChange = vi.fn()
        const { result } = renderHook(() =>
            useControllableState({ value: 1, defaultValue: 0, onChange }),
        )

        const [, setState] = result.current

        act(() => setState((prev) => prev + 1))
        const [state] = result.current
        expect(state).toBe(1)
        expect(onChange).toHaveBeenCalledWith(2)
    })
})