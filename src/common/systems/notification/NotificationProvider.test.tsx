import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { NotificationProvider } from './NotificationProvider.tsx'
import { useNotify } from './useNotify.ts'

describe('NotificationProvider', () => {
    it('does not re-render consumers when a notification is shown or dismissed', () => {
        const seen: ReturnType<typeof useNotify>[] = []
        function Consumer() {
            seen.push(useNotify())
            return null
        }

        render(
            <NotificationProvider>
                <Consumer />
            </NotificationProvider>,
        )

        act(() => seen[0]('Saved', 'success'))
        expect(screen.getByText('Saved')).toBeTruthy()
        fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))

        // The context value never changes, so consumers are not even re-rendered.
        expect(seen).toHaveLength(1)
    })
})
