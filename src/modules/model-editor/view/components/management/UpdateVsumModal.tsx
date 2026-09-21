import type { Vsum } from '../../../types/structured-vitruvius-model.ts'
import { BaseFullscreenModal } from '../../../../../common/components/BaseFullscreenModal.tsx'
import { isNil } from '../../../../../common/utils/nil-utils.ts'
import TextField from '@mui/material/TextField'
import { useEffect, useState } from 'react'
import { Button, Divider, Typography } from '@mui/material'
import { ColumnLayout, RowLayout, Spacer } from '../../../../../common/components/flex.tsx'
import type { VitruviusClient } from '../../../infra/vitruvius-client.ts'
import { useVsumApi } from '../../hooks/useVsumApi.ts'
import type { VsumDto } from '../../../types/api-vitruvius-model.ts'
import { useConfirmDialog } from '../../../../../common/systems/confirm-dialog/useConfirmDialog.ts'

interface Props {
    open: boolean
    vsum: Vsum | undefined
    client: VitruviusClient
    close: () => void
    afterSave: (vsumDto: VsumDto) => void
    afterDelete: () => void
}

/**
 * Updates the VSUM with new information and provides functionalities for editing, deleting, and saving.
 *
 * @param {object} props - The properties object.
 * @param {boolean} props.open - Determines whether the modal is open or closed.
 * @param {object} [props.vsum] - The VSUM object containing initial information to populate the modal.
 * @param {object} props.client - The client used for making API calls related to VSUM operations.
 * @param {Function} props.close - Callback function to close the modal.
 * @param {Function} props.afterSave - Callback function invoked after successfully saving the updated VSUM information.
 * @param {Function} props.afterDelete - Callback function invoked after successfully deleting the VSUM.
 */
export function UpdateVsumModal({ open, vsum, client, close, afterSave, afterDelete }: Props) {
    const [name, setName] = useState(vsum?.name ?? '')
    const [description, setDescription] = useState(vsum?.description ?? '')
    const confirmDialog = useConfirmDialog()

    useEffect(() => {
        setName(vsum?.name ?? '')
        setDescription(vsum?.description ?? '')
    }, [vsum?.name, vsum?.description])

    const vsumApi = useVsumApi(client)

    async function handleDelete() {
        confirmDialog.openConfirmDialog({
            title: 'Delete VSUM',
            text: 'Do you really want to delete this VSUM?',
            confirmLabel: 'Delete',
            onConfirm: async () => {
                if (isNil(vsum)) return
                await vsumApi.deleteVsum(vsum.id)
                afterDelete()
                close()
            },
        })
    }

    async function handleSubmit() {
        if (isNil(vsum)) return

        const updatedName = name.trim()
        if (updatedName === '') return

        const updatedVsum = await vsumApi.updateVsumInfo(vsum.id, updatedName, description)
        afterSave(updatedVsum)
        close()
    }

    return (
        <BaseFullscreenModal open={open}>
            <ColumnLayout gap={2} sx={{ padding: 2 }}>
                <Typography variant='h5'>VSUM Info</Typography>
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
                <Spacer />
                <Divider sx={{ my: 1 }} />
                <RowLayout gap={1} sx={{ height: 'unset', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <Button color='error' variant='outlined' onClick={handleDelete}>Delete</Button>
                    <Spacer />
                    <Button variant='outlined' onClick={close}>Cancel</Button>
                    <Button variant='contained' onClick={handleSubmit}>Update</Button>
                </RowLayout>
            </ColumnLayout>
        </BaseFullscreenModal>
    )
}