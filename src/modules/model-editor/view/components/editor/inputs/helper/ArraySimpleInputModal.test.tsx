import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ArraySimpleInputModal } from './ArraySimpleInputModal.tsx'

function renderModal(open: boolean, value: string[]) {
    return <ArraySimpleInputModal open={open} close={vi.fn()} value={value} onSubmit={vi.fn()} />
}

function addItem(text: string) {
    fireEvent.change(screen.getByPlaceholderText('Enter value'), { target: { value: text } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
}

describe('ArraySimpleInputModal', () => {
    it('keeps unsaved edits when the parent re-renders with an equal but new value array', () => {
        const { rerender } = render(renderModal(true, ['first']))
        addItem('second')

        rerender(renderModal(true, ['first']))

        expect(screen.getByText('first')).toBeTruthy()
        expect(screen.getByText('second')).toBeTruthy()
    })

    it('starts again from the current value when reopened', () => {
        const { rerender } = render(renderModal(true, ['first']))
        addItem('discarded')

        rerender(renderModal(false, ['first']))
        rerender(renderModal(true, ['first', 'saved']))

        expect(screen.getByText('saved')).toBeTruthy()
        expect(screen.queryByText('discarded')).toBeNull()
    })
})
