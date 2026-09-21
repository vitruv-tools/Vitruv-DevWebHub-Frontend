import type { VitruviusClient } from '../../../../model-editor/infra/vitruvius-client.ts'
import { addInconsistencyComment, listInconsistencyComments } from '../../../api/inconsistency-api.ts'
import type { InconsistencyComment } from '../../../types/open-inconsistency.ts'
import { useCallback, useEffect, useState } from 'react'
import { Avatar, Box, Button, Stack, TextField, Typography } from '@mui/material'

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
                            <Typography sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>{comment.body}</Typography>
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
                    <TextField
                        placeholder='Leave a comment'
                        multiline
                        minRows={3}
                        value={draft}
                        onChange={event => setDraft(event.target.value)}
                        disabled={submitting}
                        size='small'
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
