import { Box, Button, CircularProgress, Divider, List, ListItemButton, styled, Typography } from '@mui/material'
import React, { useEffect, useRef, useState } from 'react'
import { ColumnLayout, RowLayout } from '../../../../../common/components/flex.tsx'
import ListItemText from '@mui/material/ListItemText'
import AddIcon from '@mui/icons-material/Add'
import { BaseFullscreenModal } from '../../../../../common/components/BaseFullscreenModal.tsx'
import { CreateVsumModal } from './CreateVsumModal.tsx'
import type { SelectableObjectDto, VsumDto } from '../../../types/api-vitruvius-model.ts'
import type { VitruviusClient } from '../../../infra/vitruvius-client.ts'
import { useOpenView } from '../../hooks/useOpenView.ts'

interface Props {
    open: boolean
    onSubmit: (vsum: VsumDto, selectorId: string, selectedObjectIds: string[]) => void
    client: VitruviusClient
    allowMultipleSelections?: boolean
    topInset?: number
}

/**
 * Opens a view modal with multiple selectable and customizable options such as VSUMs, view types,
 * and selectable objects. Allows users to create new VSUMs and configure view settings based on
 * provided parameters and internal logic.
 *
 * @param {object} props - The properties for the OpenViewModal component.
 * @param {boolean} props.open - Determines whether the modal is open or closed.
 * @param {function} props.onSubmit - Callback function triggered upon submission.
 * @param {object} props.client - The client instance used for handling logic operations.
 * @param {boolean} props.allowMultipleSelections - Indicates whether multiple objects can be selected.
 */
export function OpenViewModal({ open, onSubmit, client, allowMultipleSelections, topInset = 0 }: Props) {

    const openViewLogic = useOpenView(client, onSubmit, open)

    const [isAddingVsum, setIsAddingVsum] = useState(false)

    const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([])

    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        setSelectedObjectIds([])
    }, [openViewLogic.selectableObjects])


    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTo({
                left: containerRef.current.scrollWidth,
                behavior: 'instant',
            })
        }
    }, [openViewLogic.viewTypes, openViewLogic.selectableObjects])

    async function handleShowCreateVsumModal() {
        setIsAddingVsum(true)
    }

    function handleSelect(selectedObjectId: string) {
        if (allowMultipleSelections) {
            setSelectedObjectIds(prev => {
                if (prev.includes(selectedObjectId)) {
                    return prev.filter(it => it !== selectedObjectId)
                } else {
                    return [...prev, selectedObjectId]
                }
            })
        } else {
            openViewLogic.openView([selectedObjectId])
        }
    }

    function VsumColumn() {
        return (
            <SelectorColumn>
                <Typography>VSUMs</Typography>
                <Divider />
                <List>
                    {openViewLogic.vsums.map(vsum => (
                        <React.Fragment key={vsum.id}>
                            <ListItemButton
                                selected={vsum.id === openViewLogic.selectedVsum?.id}
                                onClick={() => openViewLogic.selectVsum(vsum.id)}
                            >
                                <ListItemText primary={vsum.name} />
                            </ListItemButton>
                            <Divider />
                        </React.Fragment>
                    ))}
                </List>
                <Button variant='outlined' onClick={handleShowCreateVsumModal}><AddIcon /></Button>
            </SelectorColumn>
        )
    }

    function ViewTypeColumn({ vsum }: { vsum: VsumDto }) {
        return (
            <SelectorColumn>
                <Typography>View Types</Typography>
                <Divider />
                <List>
                    {openViewLogic.viewTypes.map(viewType => (
                        <React.Fragment key={viewType}>
                            <ListItemButton
                                selected={viewType === openViewLogic.selectedViewType}
                                onClick={() => openViewLogic.selectViewType(vsum.id, viewType)}
                            >
                                <ListItemText primary={viewType} />
                            </ListItemButton>
                            <Divider />
                        </React.Fragment>
                    ))}
                </List>
            </SelectorColumn>
        )
    }

    function SelectableObjectsColumn({ selectableObjects }: { selectableObjects: SelectableObjectDto[] }) {
        return (
            <SelectorColumn sx={{ border: 'none', flexShrink: 0 }}>
                <Typography>Selectable Objects</Typography>
                <Divider />
                <List>
                    {
                        selectableObjects.map(object => (
                            <React.Fragment key={object._id}>
                                <ListItemButton
                                    selected={selectedObjectIds.includes(object._id)}
                                    onClick={() => {
                                        handleSelect(object._id)
                                    }}
                                >
                                    <ListItemText primary={object.eClass} />
                                </ListItemButton>
                                <Divider />
                            </React.Fragment>
                        ))}
                </List>
                {allowMultipleSelections && (
                    <Button
                        variant='outlined'
                        onClick={() => openViewLogic.openView(selectedObjectIds)}
                        disabled={selectedObjectIds.length === 0}
                    >
                        Open View
                    </Button>
                )}

            </SelectorColumn>
        )
    }

    return (
        <div>
            <BaseFullscreenModal open={open} topInset={topInset}>
                <RowLayout ref={containerRef} sx={{ overflowX: 'auto' }}>
                    {openViewLogic.mode === 'loading' && (
                        <Box
                            sx={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 1,
                            }}
                        >
                            <CircularProgress />
                            <Typography color='text.secondary'>Loading VSUMs…</Typography>
                        </Box>
                    )}
                    {openViewLogic.mode === 'select' && <VsumColumn />}
                    {openViewLogic.selectedVsum && <ViewTypeColumn vsum={openViewLogic.selectedVsum} />}
                    {openViewLogic.selectedVsum && openViewLogic.selectedViewType && (
                        <SelectableObjectsColumn selectableObjects={openViewLogic.selectableObjects} />
                    )}

                </RowLayout>
            </BaseFullscreenModal>

            <CreateVsumModal
                open={isAddingVsum}
                onSubmit={(metamodel, name, description) => {
                    openViewLogic.createVsum(metamodel, name, description)
                    setIsAddingVsum(false)
                }}
                onCancel={() => setIsAddingVsum(false)}
                metamodels={openViewLogic.metamodels ?? []}
            />
        </div>
    )
}


const SelectorColumn = styled(ColumnLayout)`
    overflow-y: auto;
    width: unset;
    min-width: 250px;
    border-right: 1px solid ${(props) => props.theme.palette.divider};
    padding: ${(props) => props.theme.spacing(1)};
`