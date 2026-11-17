import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useOnChange } from './useOnChange'

describe('useOnChange', () => {
    it('should not call onChange on the initial render', () => {
        const onChange = vi.fn()
        renderHook(() => useOnChange([1, 'a'], onChange))

        expect(onChange).not.toHaveBeenCalled()
    })

    it('should not call onChange when deps are unchanged', () => {
        const onChange = vi.fn()
        const { rerender } = renderHook(({ deps }) => useOnChange(deps, onChange), {
            initialProps: { deps: [1, 'a'] as unknown[] },
        })

        rerender({ deps: [1, 'a'] })

        expect(onChange).not.toHaveBeenCalled()
    })

    it('should call onChange once when a dep changes', () => {
        const onChange = vi.fn()
        const { rerender } = renderHook(({ deps }) => useOnChange(deps, onChange), {
            initialProps: { deps: [1, 'a'] as unknown[] },
        })

        rerender({ deps: [2, 'a'] })
        rerender({ deps: [2, 'a'] })

        expect(onChange).toHaveBeenCalledTimes(1)
    })
})
