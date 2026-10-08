import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
    Alert,
    Box,
    Button,
    Chip,
    Divider,
    IconButton,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Tab,
    Tabs,
    Tooltip,
    Typography,
} from '@mui/material'
import FilterListIcon from '@mui/icons-material/FilterList'
import CheckIcon from '@mui/icons-material/Check'
import { ColumnLayout, RowLayout } from '../../../../common/components/flex.tsx'
import { AppNavButton } from '../../../../common/components/AppNavButton.tsx'
import { useAuth } from '../../../auth/context/AuthContext.tsx'
import { useNotify } from '../../../../common/systems/notification/useNotify.ts'
import { VitruviusClientImpl } from '../../../model-editor/infra/vitruvius-client-impl.ts'
import { UserInteractionModal } from '../../../model-editor/view/components/management/UserInteractionModal.tsx'
import { PropagationProgressOverlay } from '../../../model-editor/view/components/management/PropagationProgressOverlay.tsx'
import type { UserInteractionPayload } from '../../../model-editor/types/api-propagation-task.ts'
import { VITRUVIUS_SERVER_BASE_URL } from '../../../../base.ts'
import {
    getTaskStatus,
    interactionKey,
    listInconsistencies,
    pollUntilCompleteOrNextInteraction,
    recordInconsistencyResolution,
    submitTaskInteraction,
} from '../../api/inconsistency-api.ts'
import { describeInteractionChoice } from '../../helpers/describe-interaction-choice.ts'
import { formatInconsistencyDescription } from '../../helpers/inconsistency-description.ts'
import { formatSourceTargetRelation } from '../../helpers/source-target-relation.ts'
import { isRelevantToUser } from '../../helpers/relevant-to-user.ts'
import { useModelKnowledge } from '../../../users/context/ModelKnowledgeContext.tsx'
import type { InconsistencyListFilter, OpenInconsistency, OpenInconsistencyState } from '../../types/open-inconsistency.ts'
import { CommentsTab } from './tabs/CommentsTab.tsx'
import { CommitsTab } from './tabs/CommitsTab.tsx'
import { FilesChangedTab } from './tabs/FilesChangedTab.tsx'
import { ResolutionCommentDialog } from './ResolutionCommentDialog.tsx'

type Props = {
    onBack: () => void
}

type DetailTab = 'comments' | 'commits' | 'files'

const FILTERS: { value: InconsistencyListFilter, label: string }[] = [
    { value: 'OPEN', label: 'Open' },
    { value: 'RESOLVED', label: 'Resolved' },
    { value: 'FAILED', label: 'Failed' },
    { value: 'ALL', label: 'All' },
]

function shortRef(id: string): string {
    return id.replace(/-/g, '').slice(0, 4)
}

function displayTitle(item: OpenInconsistency): string {
    const base = (item.title || 'Inconsistency').trim()
    const clipped = base.length > 72 ? `${base.slice(0, 72)}…` : base
    return `${clipped}#${shortRef(item.id)}`
}

function statusChipColor(state: OpenInconsistencyState): 'success' | 'default' | 'error' {
    if (state === 'OPEN') {
        return 'success'
    }
    if (state === 'FAILED') {
        return 'error'
    }
    return 'default'
}

function statusLabel(state: OpenInconsistencyState): string {
    if (state === 'OPEN') {
        return 'Open'
    }
    if (state === 'RESOLVED') {
        return 'Resolved'
    }
    return 'Failed'
}

function listItemMeta(item: OpenInconsistency): string {
    const parts: string[] = [`#${shortRef(item.id)}`]
    if (item.createdAt) {
        parts.push(`opened ${new Date(item.createdAt).toLocaleDateString()}`)
    }
    const relation = formatSourceTargetRelation(item.metamodelName)
    if (relation) {
        parts.push(relation)
    }
    return parts.join(' · ')
}

/**
 * Inconsistency Hub — overview and detail layout
 * (title#ref, status, description, Comments / Commits / Files), without copying any vendor UI.
 */
export function InconsistencyHubPage({ onBack }: Props) {
    const notify = useNotify()
    const { user, signOut } = useAuth()
    const { knownMetamodels, openSettings } = useModelKnowledge()
    const clientRef = useRef(new VitruviusClientImpl(VITRUVIUS_SERVER_BASE_URL, message => notify(message, 'error')))
    const client = clientRef.current

    const [filter, setFilter] = useState<InconsistencyListFilter>('OPEN')
    const [modelFilter, setModelFilter] = useState<string | 'ALL'>('ALL')
    const [relevantOnly, setRelevantOnly] = useState(false)
    const [modelFilterAnchor, setModelFilterAnchor] = useState<null | HTMLElement>(null)
    const [items, setItems] = useState<OpenInconsistency[]>([])
    const [selected, setSelected] = useState<OpenInconsistency | null>(null)
    const [detailTab, setDetailTab] = useState<DetailTab>('comments')
    const [answerOpen, setAnswerOpen] = useState(false)
    const [commentDialogOpen, setCommentDialogOpen] = useState(false)
    const [pendingAnswer, setPendingAnswer] = useState<{ responseJson: string, choiceLabel: string } | null>(null)
    const [loading, setLoading] = useState(true)
    const [resolving, setResolving] = useState(false)
    const [taskAlive, setTaskAlive] = useState<boolean | null>(null)
    const [statusMessage, setStatusMessage] = useState<string | undefined>()

    const authorLabel = user?.name || user?.username || user?.email || 'anonymous'

    const refresh = useCallback(async () => {
        setLoading(true)
        try {
            const listed = await listInconsistencies(client, filter)
            setItems(listed)
            setSelected(prev => (prev ? listed.find(item => item.id === prev.id) ?? null : null))
        } catch (error) {
            notify(error instanceof Error ? error.message : String(error), 'error')
        } finally {
            setLoading(false)
        }
    }, [client, filter, notify])

    useEffect(() => {
        void refresh()
    }, [refresh])

    function withLiveInteraction(
        item: OpenInconsistency,
        interaction: UserInteractionPayload,
    ): OpenInconsistency {
        return {
            ...item,
            interaction,
            message: interaction.message ?? item.message,
            title: interaction.message ?? item.title,
        }
    }

    async function selectInconsistency(item: OpenInconsistency) {
        setSelected(item)
        setDetailTab(item.state === 'OPEN' ? 'comments' : 'files')
        setAnswerOpen(false)
        setCommentDialogOpen(false)
        setPendingAnswer(null)
        setTaskAlive(null)
        if (item.state !== 'OPEN') {
            setTaskAlive(false)
            return
        }
        try {
            const status = await getTaskStatus(client, item.taskId)
            setTaskAlive(true)
            if (status.state === 'WAITING_USER_INTERACTION' && status.interaction) {
                setSelected(withLiveInteraction(item, status.interaction))
            }
        } catch {
            setTaskAlive(false)
        }
    }

    function handleInteractionChosen(responseJson: string) {
        if (!interaction) {
            return
        }
        setPendingAnswer({
            responseJson,
            choiceLabel: describeInteractionChoice(interaction, responseJson),
        })
        setAnswerOpen(false)
        setCommentDialogOpen(true)
    }

    function handleCommentDialogCancel() {
        setCommentDialogOpen(false)
        setPendingAnswer(null)
        setAnswerOpen(true)
    }

    async function handleResolve(responseJson: string, choiceLabel: string, comment?: string) {
        if (!selected) {
            return
        }
        const current = selected
        const answeredKey = interactionKey(current.interaction as UserInteractionPayload | undefined)
        setResolving(true)
        setCommentDialogOpen(false)
        setStatusMessage('Submitting answer…')
        try {
            await submitTaskInteraction(client, current.taskId, responseJson)
            const status = await pollUntilCompleteOrNextInteraction(client, current.taskId, {
                answeredInteractionKey: answeredKey,
                onProgress: message => setStatusMessage(message),
            })

            if (status.state === 'WAITING_USER_INTERACTION' && status.interaction) {
                setSelected(withLiveInteraction(current, status.interaction))
                setPendingAnswer(null)
                setAnswerOpen(true)
                if (status.interaction.validationError) {
                    notify(status.interaction.validationError, 'warning')
                }
                return
            }

            if (status.state === 'FAILED') {
                notify(status.error ?? 'Propagation failed', 'error')
                setAnswerOpen(false)
                setPendingAnswer(null)
                await refresh()
                return
            }

            if (status.state === 'INCONSISTENT') {
                notify('Task ended inconsistent without completing.', 'warning')
                setAnswerOpen(false)
                setPendingAnswer(null)
                await refresh()
                return
            }

            notify('Inconsistency resolved; VSUM updated.', 'success')
            setAnswerOpen(false)
            setCommentDialogOpen(false)
            setPendingAnswer(null)

            await recordInconsistencyResolution(client, current.id, {
                resolvedBy: authorLabel,
                choice: choiceLabel,
                comment: comment?.trim() || undefined,
            })

            setFilter('RESOLVED')
            setDetailTab('comments')
            await refresh()
            const resolved = (await listInconsistencies(client, 'RESOLVED')).find(item => item.id === current.id)
            if (resolved) {
                setSelected(resolved)
            } else {
                setSelected(null)
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            if (message.includes('not found')) {
                setTaskAlive(false)
                notify(
                    'This inconsistency can no longer be resolved — the propagation task was lost (usually after a server restart). Refresh the list, then create a new inconsistency from the editor.',
                    'warning',
                )
            } else {
                notify(message, 'error')
            }
        } finally {
            setResolving(false)
            setStatusMessage(undefined)
        }
    }

    const interaction = selected?.interaction as UserInteractionPayload | undefined
    const canAnswer = selected?.state === 'OPEN' && Boolean(interaction) && taskAlive !== false

    const modelOptions = useMemo(() => {
        const names = new Set<string>()
        for (const item of items) {
            if (item.metamodelName) {
                names.add(item.metamodelName)
            }
        }
        return [...names].sort((a, b) => a.localeCompare(b))
    }, [items])

    const visibleItems = useMemo(() => {
        return items.filter(item => {
            if (modelFilter !== 'ALL' && item.metamodelName !== modelFilter) {
                return false
            }
            if (relevantOnly && !isRelevantToUser(item.involvedMetamodels, knownMetamodels)) {
                return false
            }
            return true
        })
    }, [items, modelFilter, relevantOnly, knownMetamodels])

    const metaLine = useMemo(() => {
        if (!selected) {
            return ''
        }
        const created = selected.createdAt ? new Date(selected.createdAt).toLocaleString() : '—'
        const model = selected.metamodelName ? ` · ${selected.metamodelName}` : ''
        const relation = formatSourceTargetRelation(selected.metamodelName)
        const relationPart = relation ? ` · ${relation}` : ''
        return `${selected.vsumName || selected.vsumId}${model}${relationPart} · created ${created}`
    }, [selected])

    return (
        <ColumnLayout sx={{ padding: 0.5, gap: 0.5, height: '100%', width: '100%', boxSizing: 'border-box' }}>
            <RowLayout sx={{ height: 'unset', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 1, flex: 1 }}>
                    <AppNavButton label='Editor' onClick={onBack} />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1, flex: 1 }}>
                    <Button size='small' onClick={() => { void refresh() }} disabled={loading}>
                        Refresh
                    </Button>
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
                </Box>
            </RowLayout>

            <Box
                sx={{
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 2,
                    overflow: 'hidden',
                    bgcolor: 'background.paper',
                }}
            >
                <Box
                    sx={{
                        width: 300,
                        flexShrink: 0,
                        borderRight: 1,
                        borderColor: 'divider',
                        display: 'flex',
                        flexDirection: 'column',
                        bgcolor: 'action.hover',
                    }}
                >
                    <Box sx={{ px: 1.5, pt: 1.5, pb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant='subtitle1' sx={{ fontWeight: 700 }}>
                                Inconsistencies
                            </Typography>
                            <Tooltip title={modelFilter === 'ALL' ? 'Filter by model' : `Model: ${modelFilter}`}>
                                <IconButton
                                    size='small'
                                    aria-label='Filter by model'
                                    aria-haspopup='menu'
                                    aria-expanded={Boolean(modelFilterAnchor)}
                                    color={modelFilter === 'ALL' ? 'default' : 'primary'}
                                    onClick={event => setModelFilterAnchor(event.currentTarget)}
                                >
                                    <FilterListIcon fontSize='small' />
                                </IconButton>
                            </Tooltip>
                            <Menu
                                anchorEl={modelFilterAnchor}
                                open={Boolean(modelFilterAnchor)}
                                onClose={() => setModelFilterAnchor(null)}
                                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                            >
                                <MenuItem
                                    selected={modelFilter === 'ALL'}
                                    onClick={() => {
                                        setModelFilter('ALL')
                                        setSelected(null)
                                        setModelFilterAnchor(null)
                                    }}
                                >
                                    <ListItemIcon sx={{ minWidth: 28 }}>
                                        {modelFilter === 'ALL' ? <CheckIcon fontSize='small' /> : null}
                                    </ListItemIcon>
                                    <ListItemText primary='All models' />
                                </MenuItem>
                                {modelOptions.map(name => (
                                    <MenuItem
                                        key={name}
                                        selected={modelFilter === name}
                                        onClick={() => {
                                            setModelFilter(name)
                                            setSelected(null)
                                            setModelFilterAnchor(null)
                                        }}
                                    >
                                        <ListItemIcon sx={{ minWidth: 28 }}>
                                            {modelFilter === name ? <CheckIcon fontSize='small' /> : null}
                                        </ListItemIcon>
                                        <ListItemText primary={name} />
                                    </MenuItem>
                                ))}
                            </Menu>
                        </Box>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {FILTERS.map(option => (
                                <Chip
                                    key={option.value}
                                    size='small'
                                    label={option.label}
                                    color={filter === option.value ? 'primary' : 'default'}
                                    variant={filter === option.value ? 'filled' : 'outlined'}
                                    onClick={() => {
                                        setFilter(option.value)
                                        setSelected(null)
                                        setAnswerOpen(false)
                                    }}
                                />
                            ))}
                            <Chip
                                size='small'
                                label='Relevant to me'
                                aria-pressed={relevantOnly}
                                color={relevantOnly ? 'primary' : 'default'}
                                variant={relevantOnly ? 'filled' : 'outlined'}
                                onClick={() => {
                                    setRelevantOnly(current => !current)
                                    setSelected(null)
                                }}
                            />
                        </Box>
                        {relevantOnly && knownMetamodels.length === 0 && (
                            <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 0.75 }}>
                                No model knowledge selected, so every inconsistency is shown.
                            </Typography>
                        )}
                        {modelFilter !== 'ALL' && (
                            <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 0.75 }}>
                                Model: {modelFilter}
                            </Typography>
                        )}
                    </Box>
                    <Divider />
                    <Box sx={{ flex: 1, overflow: 'auto' }}>
                        {loading && (
                            <Typography color='text.secondary' sx={{ p: 1.5 }}>Loading…</Typography>
                        )}
                        {!loading && visibleItems.length === 0 && (
                            <Typography color='text.secondary' sx={{ p: 1.5 }} variant='body2'>
                                No inconsistencies for this filter.
                            </Typography>
                        )}
                        <List dense disablePadding>
                            {visibleItems.map(item => (
                                <ListItemButton
                                    key={item.id}
                                    selected={selected?.id === item.id}
                                    onClick={() => { void selectInconsistency(item) }}
                                    sx={{
                                        alignItems: 'flex-start',
                                        borderBottom: 1,
                                        borderColor: 'divider',
                                        py: 1.25,
                                    }}
                                >
                                    <ListItemText
                                        primary={
                                            <Typography variant='body2' sx={{ color: 'text.primary', fontWeight: 600 }}>
                                                {(item.title || 'Inconsistency').slice(0, 80)}
                                            </Typography>
                                        }
                                        secondary={
                                            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.75, mt: 0.35 }}>
                                                <Chip
                                                    size='small'
                                                    label={statusLabel(item.state)}
                                                    color={statusChipColor(item.state)}
                                                    variant='outlined'
                                                    sx={{ height: 20, '& .MuiChip-label': { px: 0.75, fontSize: 11 } }}
                                                />
                                                <Typography variant='caption' color='text.secondary' component='span'>
                                                    {listItemMeta(item)}
                                                </Typography>
                                            </Box>
                                        }
                                    />
                                </ListItemButton>
                            ))}
                        </List>
                    </Box>
                </Box>

                <Box
                    sx={{
                        flex: 1,
                        minWidth: 0,
                        minHeight: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'auto',
                        p: 2.5,
                    }}
                >
                    {!selected && (
                        <Box sx={{ maxWidth: 520, pt: 4 }}>
                            <Typography variant='h5' sx={{ fontWeight: 700 }}>
                                Inconsistency Hub
                            </Typography>
                        </Box>
                    )}

                    {selected && (
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: detailTab === 'files' ? 1 : 1.5,
                                flex: detailTab === 'files' ? 1 : undefined,
                                minHeight: detailTab === 'files' ? 0 : undefined,
                                height: detailTab === 'files' ? '100%' : undefined,
                                maxWidth: detailTab === 'files' ? 'none' : 960,
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, flexShrink: 0 }}>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography
                                        component='h1'
                                        sx={{
                                            fontSize: detailTab === 'files'
                                                ? { xs: '1.05rem', md: '1.25rem' }
                                                : { xs: '1.35rem', md: '1.75rem' },
                                            fontWeight: 700,
                                            lineHeight: 1.25,
                                            wordBreak: 'break-word',
                                        }}
                                    >
                                        {displayTitle(selected)}
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mt: detailTab === 'files' ? 0.5 : 1 }}>
                                        <Chip
                                            size='small'
                                            label={statusLabel(selected.state)}
                                            color={statusChipColor(selected.state)}
                                            variant='outlined'
                                        />
                                        <Typography variant='body2' color='text.secondary'>
                                            {metaLine}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Box>

                            <Box
                                sx={{
                                    border: 1,
                                    borderColor: 'divider',
                                    borderRadius: 1.5,
                                    p: 1.5,
                                    bgcolor: 'action.hover',
                                    flexShrink: 0,
                                    // Keep Visualization tall: shrink description and scroll its content.
                                    ...(detailTab === 'files'
                                        ? {
                                            maxHeight: { xs: 96, md: 112 },
                                            overflow: 'auto',
                                            p: 1,
                                        }
                                        : {}),
                                }}
                            >
                                <Typography variant='subtitle2' sx={{ mb: 0.5 }}>
                                    Description
                                </Typography>
                                <Typography
                                    sx={{
                                        whiteSpace: 'pre-wrap',
                                        fontSize: detailTab === 'files' ? '0.85rem' : undefined,
                                    }}
                                >
                                    {formatInconsistencyDescription(selected)}
                                </Typography>
                                {detailTab !== 'files' && (
                                    <Typography variant='caption' color='text.secondary' display='block' sx={{ mt: 1 }}>
                                        Task {selected.taskId}
                                    </Typography>
                                )}
                            </Box>

                            {selected.state === 'OPEN' && taskAlive === false && (
                                <Alert severity='warning' sx={{ flexShrink: 0 }}>
                                    This inconsistency cannot be resolved anymore because its propagation task
                                    is no longer active (typically after a server restart). Click Refresh —
                                    it will move to Failed — then park a new inconsistency from the editor.
                                </Alert>
                            )}

                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    flexShrink: 0,
                                    borderBottom: 1,
                                    borderColor: 'divider',
                                    minHeight: 40,
                                }}
                            >
                                <Tabs
                                    value={detailTab}
                                    onChange={(_, value: DetailTab) => setDetailTab(value)}
                                    sx={{
                                        minHeight: 40,
                                        flex: 1,
                                        minWidth: 0,
                                        borderBottom: 0,
                                        '& .MuiTab-root': {
                                            textTransform: 'none',
                                            minHeight: 40,
                                            fontWeight: 600,
                                        },
                                    }}
                                >
                                    <Tab value='comments' label='Comments' />
                                    <Tab value='commits' label='Commits' />
                                    <Tab value='files' label='Visualization' />
                                </Tabs>

                                {selected.state === 'OPEN' && detailTab !== 'comments' && (
                                    <Button
                                        variant='contained'
                                        size='small'
                                        disabled={!canAnswer || resolving}
                                        onClick={() => setAnswerOpen(true)}
                                        sx={{
                                            textTransform: 'none',
                                            fontWeight: 600,
                                            flexShrink: 0,
                                            mr: 0.5,
                                        }}
                                    >
                                        + choice
                                    </Button>
                                )}
                            </Box>

                            <Box
                                sx={{
                                    pt: 0.5,
                                    flex: detailTab === 'files' ? 1 : undefined,
                                    minHeight: detailTab === 'files' ? { xs: 420, md: 520 } : undefined,
                                    display: detailTab === 'files' ? 'flex' : 'block',
                                    flexDirection: 'column',
                                    overflow: detailTab === 'files' ? 'hidden' : undefined,
                                }}
                            >
                                {detailTab === 'comments' && (
                                    <CommentsTab
                                        client={client}
                                        inconsistencyId={selected.id}
                                        authorLabel={authorLabel}
                                        canChoose={selected.state === 'OPEN'}
                                        choosingDisabled={!canAnswer || resolving}
                                        onChoose={() => setAnswerOpen(true)}
                                    />
                                )}
                                {detailTab === 'commits' && (
                                    <CommitsTab client={client} inconsistencyId={selected.id} />
                                )}
                                {detailTab === 'files' && (
                                    <FilesChangedTab inconsistency={selected} client={client} />
                                )}
                            </Box>
                        </Box>
                    )}
                </Box>
            </Box>

            <PropagationProgressOverlay open={resolving} message={statusMessage} />

            <UserInteractionModal
                open={Boolean(answerOpen && selected && interaction && !resolving)}
                interaction={interaction}
                allowDismiss={false}
                onSubmit={responseJson => {
                    handleInteractionChosen(responseJson)
                }}
            />

            <ResolutionCommentDialog
                open={Boolean(commentDialogOpen && pendingAnswer && !resolving)}
                choiceLabel={pendingAnswer?.choiceLabel ?? ''}
                onCancel={handleCommentDialogCancel}
                onConfirm={comment => {
                    if (!pendingAnswer) {
                        return
                    }
                    void handleResolve(pendingAnswer.responseJson, pendingAnswer.choiceLabel, comment)
                }}
            />
        </ColumnLayout>
    )
}
