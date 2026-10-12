import { ColumnLayout, RowLayout } from '../../../../../common/components/flex.tsx'
import { BaseFrame } from '../../../../../common/components/BaseFrame.tsx'
import { useViewLogic } from '../../hooks/useViewLogic.ts'
import { useMemo, useRef, useState, useLayoutEffect } from 'react'
import { EditorWrapper } from './EditorWrapper.tsx'
import { CustomTreeView } from '../../../../../common/components/CustomTreeView.tsx'
import { Button, Chip, ListItemIcon, MenuItem, Typography } from '@mui/material'
import { useTreeNodes } from '../../hooks/useTreeNodes.ts'
import { isNil, isNotNil } from '../../../../../common/utils/nil-utils.ts'
import { BasicMenu } from '../../../../../common/components/BasicMenu.tsx'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import ListItemText from '@mui/material/ListItemText'
import DeleteIcon from '@mui/icons-material/Delete'
import { Mermaid } from './Mermaid.tsx'
import { getTypesToStructuresResources } from '../../../helpers/structured-resource-helpers.ts'
import type { Vsum } from '../../../types/structured-vitruvius-model.ts'
import type { VsumDto } from '../../../types/api-vitruvius-model.ts'
import { EcoreModelApiToStructuredConverter } from '../../../converter/ecore-model-api-to-structured-converter.ts'
import type { ApiEcoreModelPackage } from '../../../types/api-ecore-model.ts'
import { useConfirmDialog } from '../../../../../common/systems/confirm-dialog/useConfirmDialog.ts'
import { ResizableGrid } from './ResizableGrid.tsx'
import { useNotify } from '../../../../../common/systems/notification/useNotify.ts'
import { VitruviusClientImpl } from '../../../infra/vitruvius-client-impl.ts'
import { OpenViewModal } from '../management/OpenViewModal.tsx'
import useLocalStorageState from 'use-local-storage-state'
import ShortTextIcon from '@mui/icons-material/ShortText'
import LinkIcon from '@mui/icons-material/Link'
import RemoveIcon from '@mui/icons-material/Remove'
import IntegrationInstructionsOutlinedIcon from '@mui/icons-material/IntegrationInstructionsOutlined'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import Box from '@mui/material/Box'
import { StructuredResourceIdBreadcrumbs } from './helpers/StructuredResourceIdBreadcrumbs.tsx'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { UpdateVsumModal } from '../management/UpdateVsumModal.tsx'
import { PropagationProgressOverlay } from '../management/PropagationProgressOverlay.tsx'
import { UserInteractionModal } from '../management/UserInteractionModal.tsx'
import { ALLOW_MULTIPLE_SELECTED_OBJECTS, VITRUVIUS_SERVER_BASE_URL } from '../../../../../base.ts'
import { useAuth } from '../../../../auth/context/AuthContext.tsx'
import { useModelKnowledge } from '../../../../users/context/ModelKnowledgeContext.tsx'
import { isPropagationDeferredError } from '../../../types/api-propagation-task.ts'
import { AppNavButton } from '../../../../../common/components/AppNavButton.tsx'

type Props = {
    onOpenHub?: () => void
}

/**
 * The `ModelManagerPage` component serves as the main interface for managing and interacting
 * with structured resources and models. It provides functionalities to view, update, and close
 * views, as well as manage VSUM and Ecore models.
 *
 * Core functionality includes:
 * - Opening and closing views.
 * - Handling updates for the selected VSUM.
 * - Displaying trees for Ecore models and VSUM structures.
 * - Handling errors in structured resources.
 * - Providing modals for opening views and updating VSUM metadata.
 */
export function ModelManagerPage({ onOpenHub }: Props) {

    const notify = useNotify()
    const { user, signOut } = useAuth()
    const { openSettings } = useModelKnowledge()
    const clientRef = useRef(new VitruviusClientImpl(VITRUVIUS_SERVER_BASE_URL, message => notify(message, 'error')))
    const client = clientRef.current

    const { openConfirmDialog } = useConfirmDialog()

    const [selectedVsum, setSelectedVsum] = useState<Vsum>()
    const [updateVsumModalOpened, setUpdateVsumModalOpened] = useState(false)
    const topBarRef = useRef<HTMLDivElement>(null)
    const [topBarHeight, setTopBarHeight] = useState(0)
    const viewLogic = useViewLogic(client)

    const structuredResources = viewLogic.view?.structuredResources
    const structuredResourcesWithErrors = structuredResources?.filter(it => it.propertiesWithErrors.length > 0) ?? []
    const hasErrors = structuredResourcesWithErrors.length > 0

    useLayoutEffect(() => {
        const element = topBarRef.current
        if (!element) {
            return
        }
        const bar: HTMLElement = element

        function updateHeight() {
            setTopBarHeight(bar.offsetHeight)
        }

        updateHeight()
        const observer = new ResizeObserver(updateHeight)
        observer.observe(bar)
        return () => observer.disconnect()
    }, [user, selectedVsum, viewLogic.hasChanges, viewLogic.propagationUiState.isActive, hasErrors])

    const typesToStructuresResources = useMemo(
        () => getTypesToStructuresResources(viewLogic.view?.structuredResources),
        [viewLogic.view],
    )

    const { ecoreModelTreeNodes, vsumTreeNodes } = useTreeNodes(viewLogic)

    const [selectedResourceId, setSelectedResourceId] = useLocalStorageState<string>('selectedResourceId')

    const selectedResource = useMemo(
        () => viewLogic.allStructuredResources.find(it => it.id === selectedResourceId),
        [viewLogic.allStructuredResources, selectedResourceId],
    )

    async function handleOpenView(vsumDto: VsumDto, selectorId: string, selectedObjectIds: string[]) {

        const response = await client.request(`/v1/metamodels/${vsumDto.metamodelName}/ecore-models`)
        const apiEcoreModelPackages: ApiEcoreModelPackage[] = await response.json()

        const ecoreModels = apiEcoreModelPackages.map(it =>
            new EcoreModelApiToStructuredConverter().convert(it),
        )

        const vsum: Vsum = {
            metamodelName: vsumDto.metamodelName,
            ecoreModels,
            id: vsumDto.id,
            name: vsumDto.name,
            description: vsumDto.description,
        }

        setSelectedVsum(vsum)
        await viewLogic.openView(vsum, selectorId, selectedObjectIds)
    }

    function handleUpdate() {
        const runUpdate = async () => {
            try {
                await viewLogic.updateView()
            } catch (error) {
                if (isPropagationDeferredError(error)) {
                    return
                }
                notify(error instanceof Error ? error.message : String(error), 'error')
            }
        }

        if (hasErrors) {
            openConfirmDialog({
                title: 'Errors',
                text: 'There are inputs that will most likely lead to errors. Do you want to proceed?',
                confirmLabel: 'Update',
                onConfirm: () => { void runUpdate() },
            })
        } else {
            void runUpdate()
        }
    }

    async function handleDismissInteraction() {
        try {
            await viewLogic.deferPendingPropagation()
        } catch (error) {
            notify(error instanceof Error ? error.message : String(error), 'error')
        } finally {
            await viewLogic.closeViewWithoutReload()
            setSelectedVsum(undefined)
            notify('Open inconsistency saved.', 'warning')
        }
    }

    function handleCloseView() {
        openConfirmDialog({
            title: 'Close View',
            text: 'Do you really want to close the view?',
            confirmLabel: 'Close View',
            onConfirm: () => performCloseView(),
        })
    }

    async function performCloseView() {
        await viewLogic.closeView()
        setSelectedVsum(undefined)
    }

    function handleAfterSave(vsumDto: VsumDto) {
        setSelectedVsum(prev => {
            if (isNil(prev)) {
                return undefined
            }
            return {
                ...prev,
                name: vsumDto.name,
                description: vsumDto.description,
            }
        })
    }

    return (
        <>
            <OpenViewModal
                open={isNil(viewLogic.view)}
                onSubmit={handleOpenView}
                client={client}
                allowMultipleSelections={ALLOW_MULTIPLE_SELECTED_OBJECTS}
                topInset={topBarHeight}
            />

            <UpdateVsumModal
                open={updateVsumModalOpened}
                vsum={selectedVsum}
                afterSave={handleAfterSave}
                afterDelete={() => performCloseView()}
                client={client}
                close={() => setUpdateVsumModalOpened(false)}
            />

            <PropagationProgressOverlay
                open={viewLogic.propagationUiState.isActive && viewLogic.propagationUiState.phase === 'running'}
                message={viewLogic.propagationUiState.statusMessage}
            />

            <UserInteractionModal
                open={viewLogic.propagationUiState.phase === 'interaction'}
                interaction={viewLogic.propagationUiState.interaction}
                onSubmit={viewLogic.submitInteractionResponse}
                onDismiss={() => { void handleDismissInteraction() }}
            />
            <ColumnLayout sx={{ padding: 0.5, gap: 0.5 }}>
                <Box
                    ref={topBarRef}
                    sx={{
                        width: '100%',
                        position: 'relative',
                        zIndex: theme => theme.zIndex.modal + 1,
                    }}
                >
                    <RowLayout
                        sx={{ height: 'unset', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}
                    >

                        <Box
                            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 1, flex: 1 }}
                        >
                            {onOpenHub && (
                                <AppNavButton label='Inconsistency Hub' onClick={onOpenHub} />
                            )}
                        </Box>
                        {isNotNil(selectedVsum) && (
                            <Chip
                                size='small'
                                label={
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                      <span>{selectedVsum.name}</span>
                                      <ExpandMoreIcon fontSize='small' />
                                    </span>
                                }
                                onClick={() => setUpdateVsumModalOpened(true)}
                            />
                        )}
                        <Box
                            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1, flex: 1 }}
                        >
                            {user && (
                                <Chip size='small' label={user.name || user.username || user.email || 'User'} />
                            )}
                            <Button size='small' onClick={openSettings}>
                                Model knowledge
                            </Button>
                            <Button
                                size='small'
                                onClick={() => {
                                    void signOut()
                                }}
                            >
                                Sign out
                            </Button>
                            <Button
                                size='small'
                                variant='contained'
                                color={hasErrors ? 'error' : undefined}
                                disabled={!viewLogic.hasChanges || viewLogic.propagationUiState.isActive}
                                onClick={handleUpdate}
                            >
                                Update
                            </Button>

                            <BasicMenu
                                items={[
                                    <MenuItem
                                        sx={{ color: 'error.main' }}
                                        key={1}
                                        onClick={handleCloseView}
                                    >
                                        <ListItemIcon sx={{ color: 'error.main' }}>
                                            <DeleteIcon fontSize='small' />
                                        </ListItemIcon>
                                        <ListItemText primary='Close View' />
                                    </MenuItem>,
                                ]}
                                buttonContent={<MoreVertIcon />}
                                buttonType='icon-button'
                            />
                        </Box>
                    </RowLayout>
                </Box>
                <ResizableGrid
                    cell11={
                        <BaseFrame
                            title={<Typography sx={{ fontWeight: 'bold' }}>Model</Typography>}
                        >
                            <CustomTreeView
                                items={vsumTreeNodes}
                                selectedItem={selectedResourceId}
                                onItemClick={(_, itemId) => setSelectedResourceId(itemId)}
                            />
                        </BaseFrame>
                    }
                    cell12={
                        <BaseFrame
                            title={<Typography sx={{ fontWeight: 'bold' }}>Metamodel</Typography>}
                        >
                            <CustomTreeView
                                items={ecoreModelTreeNodes}
                                icons={{
                                    'attribute': <ShortTextIcon fontSize='small' />,
                                    'reference': <LinkIcon fontSize='small' />,
                                    'literal': <RemoveIcon fontSize='small' />,
                                    'class': <IntegrationInstructionsOutlinedIcon fontSize='small' />,
                                    'package': <FolderOpenIcon fontSize='small' />,
                                }}
                            />
                        </BaseFrame>
                    }
                    cell21={
                        <BaseFrame
                            title={
                                isNil(selectedResource)
                                    ? undefined
                                    : isNil(selectedResource?.resourceSetInfo)
                                        ? 'This instance is not commit yet.'
                                        : (
                                            <StructuredResourceIdBreadcrumbs
                                                structuredResourceId={selectedResource.id}
                                                onClick={id => setSelectedResourceId(id)}
                                            />
                                        )
                            }
                            headerWidgets={
                                isNotNil(selectedResourceId) && (
                                    <BasicMenu
                                        items={[
                                            <MenuItem
                                                sx={{ color: 'error.main' }}
                                                key={1}
                                                onClick={() => viewLogic.dispatchEditViewAction({
                                                    type: 'REMOVE_CONTAINMENT_REFERENCE',
                                                    containmentReferenceId: selectedResourceId,
                                                    ignoreInputErrors: false,
                                                    ownerId: selectedResourceId,
                                                })}
                                            >
                                                <ListItemIcon sx={{ color: 'error.main' }}>
                                                    <DeleteIcon fontSize='small' />
                                                </ListItemIcon>
                                                <ListItemText primary='Löschen' />
                                            </MenuItem>,
                                        ]}
                                        buttonContent={<MoreVertIcon />}
                                        buttonType='icon-button'
                                    />
                                )
                            }
                        >
                            <ColumnLayout sx={{ overflow: 'auto' }}>
                                <EditorWrapper
                                    dispatchEditViewAction={viewLogic.dispatchEditViewAction}
                                    structuredResource={selectedResource}
                                    typesToStructuresResources={typesToStructuresResources}
                                />
                            </ColumnLayout>
                        </BaseFrame>
                    }
                    cell22={
                        <ColumnLayout>
                            <BaseFrame>
                                {isNotNil(selectedResource) && (
                                    <Mermaid structuredResource={selectedResource} />
                                )}
                            </BaseFrame>

                        </ColumnLayout>
                    }
                >

                </ResizableGrid>
            </ColumnLayout>
        </>
    )
}
