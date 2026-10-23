import type { VitruviusClient } from '../../../../model-editor/infra/vitruvius-client.ts'
import { addInconsistencyComment, listInconsistencyComments } from '../../../api/inconsistency-api.ts'
import type { InconsistencyComment } from '../../../types/open-inconsistency.ts'
import { mentionHint, splitByMentions, type MentionSuggestion } from '../../../helpers/mentions.ts'
import type { CommentMention } from '../../../types/open-inconsistency.ts'
import { listUsers } from '../../../../users/api/user-api.ts'
import { useModelKnowledge } from '../../../../users/context/ModelKnowledgeContext.tsx'
import { MentionTextField } from '../MentionTextField.tsx'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Avatar, Box, Button, Stack, Tooltip, Typography } from '@mui/material'

type Props = {
    client: VitruviusClient
    inconsistencyId: string
    authorLabel: string
    /** When set, shows + choice next to the comment compose box (OPEN inconsistencies). */
    canChoose?: boolean
    choosingDisabled?: boolean
    onChoose?: () => void
}

function initialOf(name: string): string {
    return (name.trim().charAt(0) || '?').toUpperCase()
}

function resolveMention(
    token: string,
    mentions: CommentMention[],
    candidates: MentionSuggestion[],
): CommentMention | undefined {
    const key = token.toLowerCase()
    const stored = mentions.find(item => item.name.toLowerCase() === key)
    if (stored) {
        return stored
    }
    const candidate = candidates.find(item => item.name.toLowerCase() === key)
    if (!candidate) {
        return undefined
    }
    return {
        kind: candidate.kind,
        name: candidate.name,
        label: candidate.label,
        users: [],
    }
}

/** The comment text with the tags the server recognised highlighted. */
function CommentBody({
    comment,
    candidates,
}: {
    comment: InconsistencyComment
    candidates: MentionSuggestion[]
}) {
    const mentions = comment.mentions ?? []
    const names = mentions.length > 0 ? mentions.map(mention => mention.name) : candidates.map(item => item.name)
    const segments = splitByMentions(comment.body, names)
    return (
        <Typography sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>
            {segments.map((segment, index) => {
                if (!segment.mention) {
                    return <span key={index}>{segment.text}</span>
                }
                const mention = resolveMention(segment.mention, mentions, candidates)
                const hint = mention ? mentionHint(mention) : segment.mention
                return (
                    <Tooltip
                        key={index}
                        title={hint}
                        arrow
                        enterDelay={200}
                        slotProps={{ popper: { sx: { zIndex: 2000 } } }}
                    >
                        <Box
                            component='span'
                            tabIndex={0}
                            sx={{
                                color: 'primary.main',
                                fontWeight: 600,
                                bgcolor: 'action.hover',
                                borderRadius: 0.5,
                                px: 0.25,
                                cursor: 'help',
                            }}
                        >
                            {segment.text}
                            <Box
                                component='span'
                                sx={{
                                    fontWeight: 400,
                                    color: 'text.secondary',
                                    fontSize: '0.85em',
                                    ml: 0.5,
                                }}
                            >
                                ({hint})
                            </Box>
                        </Box>
                    </Tooltip>
                )
            })}
        </Typography>
    )
}

export function CommentsTab({
    client,
    inconsistencyId,
    authorLabel,
    canChoose = false,
    choosingDisabled = false,
    onChoose,
}: Props) {
    const [comments, setComments] = useState<InconsistencyComment[]>([])
    const [draft, setDraft] = useState('')
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [users, setUsers] = useState<{ username: string, displayName?: string | null }[]>([])
    const { catalog } = useModelKnowledge()

    useEffect(() => {
        const controller = new AbortController()
        listUsers(controller.signal)
            .then(setUsers)
            .catch(err => {
                if (!controller.signal.aborted) {
                    // Tagging still works by typing the name; only the list is missing.
                    console.error('Could not load users for tagging:', err)
                }
            })
        return () => controller.abort()
    }, [])

    const candidates = useMemo<MentionSuggestion[]>(() => [
        ...users.map(user => ({
            kind: 'USER' as const,
            name: user.username,
            label: user.displayName || user.username,
        })),
        ...catalog.map(metamodel => ({
            kind: 'METAMODEL' as const,
            name: metamodel.name,
            label: metamodel.label,
        })),
    ], [users, catalog])

    const refresh = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            setComments(await listInconsistencyComments(client, inconsistencyId))
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err))
        } finally {
            setLoading(false)
        }
    }, [client, inconsistencyId])

    useEffect(() => {
        void refresh()
    }, [refresh])

    async function handleSubmit() {
        if (!draft.trim()) {
            return
        }
        setSubmitting(true)
        setError(null)
        try {
            await addInconsistencyComment(client, inconsistencyId, {
                author: authorLabel,
                body: draft.trim(),
            })
            setDraft('')
            await refresh()
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err))
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {loading && <Typography color='text.secondary'>Loading comments…</Typography>}
            {error && <Typography color='error'>{error}</Typography>}
            {!loading && comments.length === 0 && null}
            <Stack spacing={1.5}>
                {comments.map(comment => (
                    <Box
                        key={comment.id}
                        sx={{
                            display: 'flex',
                            gap: 1.25,
                            border: 1,
                            borderColor: 'divider',
                            borderRadius: 1.5,
                            p: 1.5,
                        }}
                    >
                        <Avatar sx={{ width: 32, height: 32, fontSize: 14, bgcolor: 'primary.main' }}>
                            {initialOf(comment.author)}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant='subtitle2'>
                                {comment.author}
                                {comment.createdAt && (
                                    <Typography component='span' variant='caption' color='text.secondary' sx={{ ml: 1 }}>
                                        {new Date(comment.createdAt).toLocaleString()}
                                    </Typography>
                                )}
                            </Typography>
                            <CommentBody comment={comment} candidates={candidates} />
                        </Box>
                    </Box>
                ))}
            </Stack>

            <Box
                sx={{
                    display: 'flex',
                    gap: 1.25,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1.5,
                    p: 1.5,
                }}
            >
                <Avatar sx={{ width: 32, height: 32, fontSize: 14 }}>{initialOf(authorLabel)}</Avatar>
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <MentionTextField
                        placeholder='Leave a comment. Type @ to tag a user or metamodel'
                        value={draft}
                        onChange={setDraft}
                        candidates={candidates}
                        disabled={submitting}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1 }}>
                        {canChoose && onChoose && (
                            <Button
                                variant='contained'
                                size='small'
                                disabled={choosingDisabled}
                                onClick={onChoose}
                                sx={{ textTransform: 'none', fontWeight: 600 }}
                            >
                                + choice
                            </Button>
                        )}
                        <Button
                            variant='contained'
                            size='small'
                            disabled={submitting || !draft.trim()}
                            onClick={() => { void handleSubmit() }}
                            sx={{ textTransform: 'none', fontWeight: 600 }}
                        >
                            Comment
                        </Button>
                    </Box>
                </Box>
            </Box>
        </Box>
    )
}
