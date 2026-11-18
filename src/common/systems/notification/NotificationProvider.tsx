import { Button, Snackbar, SnackbarContent } from '@mui/material'
import { useCallback, useState } from 'react'
import { isNotNil } from '../../utils/nil-utils.ts'
import type { ChildrenProps } from '../../types.ts'
import { NotificationContext, type NotificationColor as Color } from './useNotify.ts'

/**
 * A provider component for managing notifications within the application. It renders a context
 * to supply the notification function to child components and displays a snackbar for notifications.
 *
 * @param {Object} props - The component properties.
 * @param {React.ReactNode} props.children - The child elements wrapped by the NotificationProvider.
 */
export function NotificationProvider({ children }: ChildrenProps) {
    const [message, setMessage] = useState<string>()
    const [color, setColor] = useState<Color>('primary')

    const handleClose = () => setMessage(undefined)

    // Stable identity, so consumers can list `notify` as an effect dependency without re-running
    // the effect every time a notification is shown or dismissed.
    const notify = useCallback((message: string, color: Color) => {
        setMessage(message)
        setColor(color)
    }, [])

    return (
        <NotificationContext.Provider value={notify}>
            {children}
            <Snackbar
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                open={isNotNil(message)}
            >
                <SnackbarContent
                    sx={{ backgroundColor: (theme) => theme.palette[color].main }}
                    message={message}
                    action={
                        <Button size="small" color="inherit" onClick={handleClose}>
                            Dismiss
                        </Button>
                    }
                />
            </Snackbar>
        </NotificationContext.Provider>
    )
}
