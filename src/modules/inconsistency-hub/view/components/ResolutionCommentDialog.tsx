import { useEffect, useState } from 'react'
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    TextField,
} from '@mui/material'

type Props = {
    open: boolean
    choiceLabel: string
    onConfirm: (comment: string) => void
    onCancel: () => void
}

/**
 * Optional resolution comment step shown in the hub after the user picks an interaction choice.
 */
export function ResolutionCommentDialog({ open, choiceLabel, onConfirm, onCancel }: Props) {
    const [comment, setComment] = useState('')

    useEffect(() => {
        if (open) {
            setComment('')
        }
    }, [open, choiceLabel])

    return (
        <Dialog open={open} maxWidth='sm' fullWidth disableEscapeKeyDown>
            <DialogTitle>Confirm resolution</DialogTitle>
            <DialogContent>
                <DialogContentText sx={{ mb: 2 }}>
                    Choice: <strong>{choiceLabel}</strong>
                </DialogContentText>
                <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    label='Resolution comment (optional)'
                    placeholder='Add a note about why you chose this option…'
                    value={comment}
                    onChange={event => setComment(event.target.value)}
                    autoFocus
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel}>Back</Button>
                <Button variant='contained' onClick={() => onConfirm(comment)}>
                    Resolve
                </Button>
            </DialogActions>
        </Dialog>
    )
}
