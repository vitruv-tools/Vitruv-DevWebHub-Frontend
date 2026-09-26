import { useMemo, useState } from 'react'
import {
    Box,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    FormControlLabel,
    IconButton,
    Radio,
    RadioGroup,
    TextField,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import type { UserInteractionPayload } from '../../../types/api-propagation-task.ts'
import { buildInteractionResponse, getInteractionKind } from '../../../helpers/build-interaction-response.ts'

type Props = {
    open: boolean
    interaction?: UserInteractionPayload
    onSubmit: (responseJson: string) => void
    onDismiss?: () => void
    allowDismiss?: boolean
}

/**
 * Displays a Vitruv user interaction prompt during async propagation and submits the response to the server.
 * For free-text prompts, shows {@code validationError} from the server and allows retry.
 */
export function UserInteractionModal({
    open,
    interaction,
    onSubmit,
    onDismiss,
    allowDismiss = true,
}: Props) {
    if (!interaction) {
        return null
    }

    const resetKey = `${interaction.eClass}|${interaction.message ?? ''}|${interaction.validationError ?? ''}`

    return (
        <UserInteractionModalForm
            key={resetKey}
            open={open}
            interaction={interaction}
            onSubmit={onSubmit}
            onDismiss={onDismiss}
            allowDismiss={allowDismiss}
        />
    )
}

type FormProps = {
    open: boolean
    interaction: UserInteractionPayload
    onSubmit: (responseJson: string) => void
    onDismiss?: () => void
    allowDismiss?: boolean
}

function UserInteractionModalForm({
    open,
    interaction,
    onSubmit,
    onDismiss,
    allowDismiss = true,
}: FormProps) {
    const kind = getInteractionKind(interaction)

    const [text, setText] = useState('')
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [selectedIndices, setSelectedIndices] = useState<number[]>([])

    const choices = useMemo(() => interaction.choices ?? [], [interaction])
    const validationError = interaction.validationError

    function submitConfirmation(confirmed: boolean) {
        onSubmit(buildInteractionResponse(interaction, confirmed))
    }

    function handleSubmit() {
        switch (kind) {
            case 'notification':
                onSubmit(buildInteractionResponse(interaction, true))
                break
            case 'freeText':
                onSubmit(buildInteractionResponse(interaction, text))
                break
            case 'singleSelection':
                onSubmit(buildInteractionResponse(interaction, selectedIndex))
                break
            case 'multiSelection':
                onSubmit(buildInteractionResponse(interaction, selectedIndices))
                break
            default:
                throw new Error(`Unsupported interaction: ${interaction.eClass}`)
        }
    }

    function toggleMultiIndex(index: number) {
        setSelectedIndices(prev =>
            prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index].sort((a, b) => a - b),
        )
    }

    return (
        <Dialog open={open} maxWidth='sm' fullWidth disableEscapeKeyDown>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 1 }}>
                <Box component='span' sx={{ flex: 1 }}>
                    Propagation requires your input
                </Box>
                {allowDismiss && onDismiss && (
                    <IconButton
                        aria-label='Close dialog and view'
                        onClick={onDismiss}
                        size='small'
                    >
                        <CloseIcon />
                    </IconButton>
                )}
            </DialogTitle>
            <DialogContent>
                <DialogContentText sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
                    {interaction.message ?? 'Please respond to continue propagation.'}
                </DialogContentText>

                {kind === 'freeText' && (
                    <TextField
                        fullWidth
                        label='Your answer'
                        value={text}
                        onChange={e => setText(e.target.value)}
                        autoFocus
                        error={Boolean(validationError)}
                        helperText={validationError ?? ' '}
                    />
                )}

                {kind === 'singleSelection' && (
                    <RadioGroup value={selectedIndex} onChange={e => setSelectedIndex(Number(e.target.value))}>
                        {choices.map((choice, index) => (
                            <FormControlLabel
                                key={index}
                                value={index}
                                control={<Radio />}
                                label={choice}
                            />
                        ))}
                    </RadioGroup>
                )}

                {kind === 'multiSelection' && (
                    <>
                        {choices.map((choice, index) => (
                            <FormControlLabel
                                key={index}
                                control={
                                    <Checkbox
                                        checked={selectedIndices.includes(index)}
                                        onChange={() => toggleMultiIndex(index)}
                                    />
                                }
                                label={`${index}: ${choice}`}
                            />
                        ))}
                    </>
                )}
            </DialogContent>
            <DialogActions>
                {kind === 'confirmation' && (
                    <>
                        <Button onClick={() => submitConfirmation(false)}>No</Button>
                        <Button variant='contained' onClick={() => submitConfirmation(true)} autoFocus>
                            Yes
                        </Button>
                    </>
                )}
                {(kind === 'notification' || kind === 'freeText' || kind === 'singleSelection' || kind === 'multiSelection') && (
                    <Button variant='contained' onClick={handleSubmit}>
                        {kind === 'notification' ? 'OK' : 'Submit'}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    )
}
