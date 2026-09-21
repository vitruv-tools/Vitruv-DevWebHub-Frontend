import { BaseFullscreenModal } from '../../../../../common/components/BaseFullscreenModal.tsx'
import { Button, Divider, FormControl, InputLabel, MenuItem, Select, Typography } from '@mui/material'
import TextField from '@mui/material/TextField'
import { useState } from 'react'
import { ColumnLayout, RowLayout, Spacer } from '../../../../../common/components/flex.tsx'

interface Props {
    open: boolean,
    onSubmit: (metamodel: string, name: string, description: string) => void,
    onCancel: () => void,
    metamodels: string[]
}

/**
 * Creates a modal for initializing and submitting a new VSUM.
 *
 * @param {Object} params - The parameters for configuring the VSUM modal.
 * @param {boolean} params.open - Specifies whether the modal is open or closed.
 * @param {function} params.onSubmit - Callback function invoked when the user submits the form. Receives the selected metamodel, name, and description as arguments.
 * @param {function} params.onCancel - Callback function invoked when the user cancels the modal.
 * @param {Array<string>} params.metamodels - An array of strings representing available metamodel options.
 */
export function CreateVsumModal({ open, onSubmit, onCancel, metamodels }: Props) {
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [metamodel, setMetamodel] = useState<string>('')

    function handleSubmit() {
        if (name.trim() === '' || metamodel === '') return

        onSubmit(metamodel, name, description)
    }

    return (
        <BaseFullscreenModal open={open}>
            <ColumnLayout gap={2} sx={{ padding: 2 }}>
                <Typography variant='h5'>Create VSUM</Typography>
                <Divider />

                <TextField
                    fullWidth
                    label='Name'
                    value={name}
                    onChange={event => setName(event.target.value)}
                />
                <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    maxRows={10}
                    label='Description'
                    value={description}
                    onChange={event => setDescription(event.target.value)}
                />

                <FormControl fullWidth>
                    <InputLabel id='metamodel-label'>Metamodel</InputLabel>
                    <Select
                        value={metamodel}
                        labelId='metamodel-label'
                        label='Metamodel'
                        onChange={event => setMetamodel(event.target.value)}
                    >
                        {metamodels.map(it => <MenuItem key={it} value={it}>{it}</MenuItem>)}
                    </Select>
                </FormControl>

                <Spacer />

                <Divider sx={{ my: 1 }} />
                <RowLayout gap={1} sx={{ height: 'unset', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <Button variant='outlined' onClick={onCancel}>Cancel</Button>
                    <Button variant='contained' onClick={handleSubmit}>Create</Button>
                </RowLayout>
            </ColumnLayout>

        </BaseFullscreenModal>
    )
}