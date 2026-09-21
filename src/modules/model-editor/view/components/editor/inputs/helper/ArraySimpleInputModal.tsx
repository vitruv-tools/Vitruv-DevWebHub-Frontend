import { BaseFullscreenModal } from '../../../../../../../common/components/BaseFullscreenModal.tsx'
import { ColumnLayout, RowLayout, Spacer } from '../../../../../../../common/components/flex.tsx'
import { useEffect, useMemo, useState } from 'react'
import { Button, IconButton, List, ListItem, ListItemButton, ListItemText, Paper, Typography } from '@mui/material'
import TextField from '@mui/material/TextField'
import DeleteIcon from '@mui/icons-material/Delete'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import { styled } from '@mui/material/styles'
import { DragDropProvider } from '@dnd-kit/react'
import { isSortable, useSortable } from '@dnd-kit/react/sortable'

interface Props {
    open: boolean
    close: () => void
    value: string[] | undefined
    onSubmit: (value: string | string[] | undefined, ignoreErrors: boolean) => boolean
    title?: string
}

type EditableItem = { id: string; value: string }

type SortableRowProps = {
    item: EditableItem
    index: number
    selected: boolean
    onSelect: (id: string) => void
    onDelete: (id: string) => void
}

/**
 * A modal component for managing a list of simple array inputs with add, edit, delete, and sorting capabilities.
 *
 * @param {Object} props - Component properties.
 * @param {boolean} props.open - Controls the visibility of the modal.
 * @param {Function} props.close - Callback function to close the modal.
 * @param {Array<string>} props.value - Initial values for the array items.
 * @param {Function} props.onSubmit - Callback function triggered on submission. Receives the updated array and a success flag as arguments.
 * @param {string} [props.title] - An optional title for the modal.
 */
export function ArraySimpleInputModal({ open, close, value, onSubmit, title }: Props) {
    const [items, setItems] = useState<EditableItem[]>([])
    const [draft, setDraft] = useState('')
    const [editingId, setEditingId] = useState<string | null>(null)

    useEffect(() => {
        setItems((value ?? []).map((entry, index) => ({ id: `${index}-${crypto.randomUUID()}`, value: entry })))
        setDraft('')
        setEditingId(null)
    }, [value, open])

    const sortedIds = useMemo(() => items.map((i) => i.id), [items])

    function handleAdd() {
        setItems((prev) => [...prev, { id: crypto.randomUUID(), value: draft }])
        setDraft('')
    }

    function handleSelect(id: string) {
        const item = items.find((e) => e.id === id)
        if (!item) return
        setEditingId(id)
        setDraft(item.value)
    }

    function handleCancelEdit() {
        setEditingId(null)
        setDraft('')
    }

    function handleDoneEdit() {
        if (!editingId) return
        setItems((prev) => prev.map((item) => (item.id === editingId ? { ...item, value: draft } : item)))
        setEditingId(null)
        setDraft('')
    }

    function handleDelete(id: string) {
        setItems((prev) => prev.filter((item) => item.id !== id))
        if (editingId === id) handleCancelEdit()
    }

    function handleSubmit() {
        if (onSubmit(items.map((item) => item.value), true)) close()
    }

    function handleDragEnd(event: any) {
        if (event.canceled || !isSortable(event.operation.source)) return
        const { initialIndex, index } = event.operation.source
        if (initialIndex === index) return
        setItems((prev) => {
            const next = [...prev]
            next.splice(index, 0, next.splice(initialIndex, 1)[0])
            return next
        })
    }

    return (
        <BaseFullscreenModal open={open} onClose={close}>
            <ColumnLayout sx={{ padding: 2, gap: 2 }}>
                {title && <Typography variant='h6'>{title}</Typography>}

                <TextField
                    multiline
                    minRows={3}
                    maxRows={15}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder='Enter value'
                    fullWidth
                />

                <RowLayout sx={{ height: 'unset', justifyContent: 'flex-end', gap: 1 }}>
                    {editingId ? (
                        <>
                            <Button variant='outlined' onClick={handleCancelEdit}>Cancel</Button>
                            <Button variant='contained' onClick={handleDoneEdit}>Done</Button>
                        </>
                    ) : (
                        <Button variant='contained' onClick={handleAdd}>Add</Button>
                    )}
                </RowLayout>

                <Paper variant='outlined' sx={{ flex: 1, minHeight: 0, overflow: 'auto', p: 1 }}>
                    <DragDropProvider onDragEnd={handleDragEnd}>
                        <List sx={{ p: 0 }}>
                            {items.map((item, index) => (
                                <SortableRow
                                    key={item.id}
                                    item={item}
                                    index={index}
                                    selected={editingId === item.id}
                                    onSelect={handleSelect}
                                    onDelete={handleDelete}
                                />
                            ))}
                        </List>
                    </DragDropProvider>
                    {items.length === 0 && (
                        <Typography variant='body2' color='text.secondary' sx={{ p: 1 }}>
                            No items yet.
                        </Typography>
                    )}
                </Paper>

                <Spacer />

                <RowLayout sx={{ height: 'unset', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                    <Button variant='outlined' onClick={close}>Cancel</Button>
                    <Button variant='contained' onClick={handleSubmit}>Submit</Button>
                </RowLayout>
            </ColumnLayout>
        </BaseFullscreenModal>
    )
}

function SortableRow({ item, index, selected, onSelect, onDelete }: SortableRowProps) {
    const { ref } = useSortable({ id: item.id, index })

    return (
        <SortableItemRoot ref={ref} elevation={0} selected={selected}>
            <ListItem>
                <DragHandle>
                    <DragIndicatorIcon fontSize='small' />
                </DragHandle>
                <ListItemButton
                    onClick={() => onSelect(item.id)} selected={selected} sx={{ borderRadius: 2, minWidth: 0, flex: 1 }}
                >
                    <ListItemText
                        primary={item.value}
                        slotProps={{ primary: { noWrap: true } }}
                    />
                </ListItemButton>
                <IconButton edge='end' aria-label='delete' onClick={() => onDelete(item.id)}>
                    <DeleteIcon />
                </IconButton>
            </ListItem>
        </SortableItemRoot>
    )
}

const SortableItemRoot = styled(Paper, {
    shouldForwardProp: (prop) => prop !== 'selected',
})<{ selected: boolean }>(({ theme, selected }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    padding: theme.spacing(0.5),
    marginBottom: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
    border: `1px solid ${selected ? theme.palette.primary.main : theme.palette.divider}`,
}))

const DragHandle = styled('div')(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    cursor: 'grab',
    userSelect: 'none',
    paddingInline: theme.spacing(0.5, 0.5),
    color: theme.palette.text.secondary,
}))
