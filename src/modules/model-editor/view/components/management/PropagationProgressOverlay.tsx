import { Backdrop, CircularProgress, Typography } from '@mui/material'
import { ColumnLayout } from '../../../../../common/components/flex.tsx'

type Props = {
    open: boolean
    message?: string
}

/**
 * Blocks the UI while async change propagation is running on the server.
 */
export function PropagationProgressOverlay({ open, message }: Props) {
    if (!open) {
        return null
    }

    return (
        <Backdrop open={open} sx={{ zIndex: theme => theme.zIndex.modal + 1, color: '#fff' }}>
            <ColumnLayout sx={{ alignItems: 'center', gap: 2 }}>
                <CircularProgress color='inherit' />
                <Typography variant='body1'>
                    {message ?? 'Propagating changes…'}
                </Typography>
            </ColumnLayout>
        </Backdrop>
    )
}
