import { useContext } from 'react'
import { ConfirmDialogContext } from './ConfirmDialogProvider.tsx'
import { isNil } from '../../utils/nil-utils.ts'

/**
 * Custom hook to access the ConfirmDialog context.
 * This hook provides access to the functionality and state managed
 * by the ConfirmDialogProvider. It must be called within a ConfirmDialogProvider.
 *
 * @throws {Error} If the hook is used outside of a ConfirmDialogProvider.
 * @return The context value of ConfirmDialog, which includes methods and state provided by the ConfirmDialogProvider.
 */
export function useConfirmDialog() {
    const context = useContext(ConfirmDialogContext)

    if (isNil(context)) {
        throw new Error('useConfirmDialog must be used within a ConfirmDialogProvider')
    }

    return context
}
