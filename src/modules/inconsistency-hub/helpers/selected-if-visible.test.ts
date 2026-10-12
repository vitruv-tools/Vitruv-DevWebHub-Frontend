import { describe, expect, it } from 'vitest'
import { keepSelectedIfVisible } from './selected-if-visible.ts'

describe('keepSelectedIfVisible', () => {
    const visible = [{ id: 'a' }, { id: 'b' }]

    it('keeps the selected row when it is still in the filtered list', () => {
        const selected = visible[1]
        expect(keepSelectedIfVisible(selected, visible)).toBe(selected)
    })

    it('clears the selected row when filtering removed it', () => {
        expect(keepSelectedIfVisible({ id: 'c' }, visible)).toBeNull()
    })

    it('stays empty when nothing is selected', () => {
        expect(keepSelectedIfVisible(null, visible)).toBeNull()
    })
})
