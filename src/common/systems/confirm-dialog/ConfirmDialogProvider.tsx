import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    useMediaQuery,
    useTheme,
} from '@mui/material'
import { type ReactNode, useCallback, useMemo, useState } from 'react'
import {
    ConfirmDialogContext,
    type ConfirmDialogContextValue,
    type ConfirmDialogOptions,
} from './useConfirmDialog.ts'

interface ConfirmDialogProviderProps {
    children: ReactNode
}

/**
 * Provides a confirmation dialog context to its child components.
 * This component wraps its children with a context that allows opening and closing
 * a confirmation dialog with customizable options.
 *
 * @param {ConfirmDialogProviderProps} props - The props for the ConfirmDialogProvider component.
 * @param {React.ReactNode} props.children - The child components to be wrapped by the provider.
 */
export function ConfirmDialogProvider({ children }: ConfirmDialogProviderProps) {
    const theme = useTheme()
    const fullScreen = useMediaQuery(theme.breakpoints.down('xs'))
    const [open, setOpen] = useState(false)
    const [options, setOptions] = useState<ConfirmDialogOptions | null>(null)

    const closeConfirmDialog = useCallback(() => {
        setOpen(false)
    }, [])

    const openConfirmDialog = useCallback((dialogOptions: ConfirmDialogOptions) => {
        setOptions(dialogOptions)
        setOpen(true)
    }, [])

    const handleCancel = useCallback(() => {
        options?.onCancel?.()
        setOpen(false)
    }, [options])

    const handleConfirm = useCallback(() => {
        options?.onConfirm()
        setOpen(false)
    }, [options])

    const value = useMemo<ConfirmDialogContextValue>(() => {
        return {
            openConfirmDialog,
            closeConfirmDialog,
        }
    }, [openConfirmDialog, closeConfirmDialog])

    return (
        <ConfirmDialogContext.Provider value={value}>
            {children}

            {open && options && (
                <Dialog fullScreen={fullScreen} open={open} onClose={handleCancel}>
                    <DialogTitle>{options.title}</DialogTitle>
                    <DialogContent>
                        <DialogContentText>{options.text}</DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCancel} color="primary">
                            Cancel
                        </Button>
                        <Button onClick={handleConfirm} color="error">
                            {options.confirmLabel}
                        </Button>
                    </DialogActions>
                </Dialog>
            )}
        </ConfirmDialogContext.Provider>
    )
}
