import { useContext } from 'react'
import { isNil } from '../../utils/nil-utils.ts'
import { NotificationContext } from './NotificationProvider.tsx'

/**
 * Provides access to the notification context, allowing components to send notifications.
 * This hook must be used within a `NotificationProvider` to function properly.
 *
 * @throws {Error} Throws an error if used outside of a `NotificationProvider`.
 * @return The notification context for sending notifications.
 */
export function useNotify() {
    const context = useContext(NotificationContext)

    if (isNil(context)) {
        throw new Error('useNotify must be used within a NotificationProvider')
    }

    return context
}
