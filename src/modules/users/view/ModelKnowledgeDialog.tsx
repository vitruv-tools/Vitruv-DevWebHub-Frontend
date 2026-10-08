import { useEffect, useState } from 'react'
import {
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    FormGroup,
    Typography,
} from '@mui/material'
import { useNotify } from '../../../common/systems/notification/useNotify.ts'
import type { KnowledgeMetamodel } from '../api/user-api.ts'

type Props = {
    open: boolean
    catalog: KnowledgeMetamodel[]
    knownMetamodels: string[]
    onClose: () => void
    onSave: (metamodels: string[]) => Promise<void>
}

export function ModelKnowledgeDialog({ open, catalog, knownMetamodels, onClose, onSave }: Props) {
    const notify = useNotify()
    const [selected, setSelected] = useState<string[]>([])
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (open) {
            setSelected(knownMetamodels)
        }
    }, [open, knownMetamodels])

    function toggle(name: string) {
        setSelected(current => (
            current.includes(name)
                ? current.filter(item => item !== name)
                : [...current, name]
        ))
    }

    async function save() {
        setSaving(true)
        try {
            await onSave(selected)
            notify('Model knowledge saved', 'success')
            onClose()
        } catch (error) {
            notify(error instanceof Error ? error.message : String(error), 'error')
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={open} onClose={saving ? () => undefined : onClose} fullWidth maxWidth='xs'>
            <DialogTitle>Model knowledge</DialogTitle>
            <DialogContent>
                <Typography variant='body2' color='text.secondary' sx={{ mb: 1.5 }}>
                    Choose the metamodels you know. The Hub can then show inconsistencies
                    where you know the source or the target.
                </Typography>
                {catalog.length === 0 && (
                    <Typography variant='body2'>No metamodels are available.</Typography>
                )}
                <FormGroup>
                    {catalog.map(metamodel => (
                        <FormControlLabel
                            key={metamodel.name}
                            control={
                                <Checkbox
                                    checked={selected.includes(metamodel.name)}
                                    onChange={() => toggle(metamodel.name)}
                                />
                            }
                            label={metamodel.label}
                        />
                    ))}
                </FormGroup>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={saving}>Cancel</Button>
                <Button variant='contained' onClick={() => { void save() }} disabled={saving || catalog.length === 0}>
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    )
}
