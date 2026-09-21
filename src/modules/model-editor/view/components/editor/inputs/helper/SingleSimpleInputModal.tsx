import { BaseFullscreenModal } from '../../../../../../../common/components/BaseFullscreenModal.tsx'
import { ColumnLayout, RowLayout, Spacer } from '../../../../../../../common/components/flex.tsx'
import { useEffect, useState } from 'react'
import { Button, Typography } from '@mui/material'
import type { InputError } from '../../../../../types/error.ts'
import { colorOfInputErrorSeverity } from '../../../../../helpers/display-helpers.ts'
import TextField from '@mui/material/TextField'

interface Props {
    open: boolean
    close: () => void
    inputErrors: InputError[]
    onSubmit: (value: string | string[] | undefined, ignoreErrors: boolean) => boolean
    value: string | undefined
}

/**
 * A modal component that presents a single simple input field with submit and cancel controls.
 * It allows the user to make an input, displays validation errors, and triggers a submission handler.
 *
 * @param {Object} props - The component properties.
 * @param {string} props.value - The initial value of the input field.
 * @param {boolean} props.open - A flag indicating whether the modal is open.
 * @param {Function} props.close - A callback function that is triggered when the modal needs to close.
 * @param {Array<Object>} props.inputErrors - An array of input error objects with message and severity properties.
 * @param {Function} props.onSubmit - A callback function that is triggered when the form is submitted. Receives the input value and a "submitted" status flag.
 */
export function SingleSimpleInputModal({ value, open, close, inputErrors, onSubmit }: Props) {

    const [draft, setDraft] = useState('')

    useEffect(() => {
        setDraft(value ?? '')
    }, [value])


    function handleSubmit() {
        onSubmit(draft, true)
    }

    return (
        <BaseFullscreenModal open={open}>
            <ColumnLayout sx={{ padding: 2 }}>
                <TextField
                    multiline
                    minRows={3}
                    maxRows={15}
                    value={draft}
                    onChange={event => setDraft(event.target.value)}
                />

                {inputErrors.map(it => (
                    <Typography
                        key={it.message}
                        color={colorOfInputErrorSeverity(it.severity)}
                    >
                        {it.message}
                    </Typography>
                ))}
                <Spacer />
                <RowLayout sx={{ height: 'unset', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                    <Button variant='outlined' onClick={close}>Cancel</Button>
                    <Button variant='contained' onClick={handleSubmit}>
                        Submit
                    </Button>
                </RowLayout>
            </ColumnLayout>

        </BaseFullscreenModal>
    )
}