import type { VitruviusClient } from '../../../../model-editor/infra/vitruvius-client.ts'
import {
    addInconsistencyComment,
    listInconsistencyComments,
} from '../../../api/inconsistency-api.ts'
import type { InconsistencyComment } from '../../../types/open-inconsistency.ts'
import { useState } from 'react'
import { useAsyncData } from '../../../../../common/hooks/useAsyncData.ts'
import { useOnChange } from '../../../../../common/hooks/useOnChange.ts'
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

const NO_COMMENTS: InconsistencyComment[] = []

export function CommentsTab({
    client,
    inconsistencyId,
    authorLabel,
    canChoose = false,
    choosingDisabled = false,
    onChoose,
}: Props) {
    const {
        data: comments,
        loading,
        error: loadError,
        reload,
    } = useAsyncData(
        () => listInconsistencyComments(client, inconsistencyId),
        [client, inconsistencyId],
        NO_COMMENTS,
    )
    const [draft, setDraft] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState<string | null>(null)
    const error = submitError ?? loadError

    useOnChange([client, inconsistencyId], () => {
        setSubmitError(null)
    })

    async function handleSubmit() {
        if (!draft.trim()) {
            return
        }
        setSubmitting(true)
        setSubmitError(null)
        try {
            await addInconsistencyComment(client, inconsistencyId, {
                author: authorLabel,
                body: draft.trim(),
            })
            setDraft('')
            reload()
        } catch (err) {
            setSubmitError(err instanceof Error ? err.message : String(err))
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {loading && <Typography color="text.secondary">Loading comments…</Typography>}
            {error && <Typography color="error">{error}</Typography>}
            {!loading && comments.length === 0 && null}
            <Stack spacing={1.5}>
                {comments.map((comment) => (
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
                        <Avatar
                            sx={{ width: 32, height: 32, fontSize: 14, bgcolor: 'primary.main' }}
                        >
                            {initialOf(comment.author)}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="subtitle2">
                                {comment.author}
                                {comment.createdAt && (
                                    <Typography
                                        component="span"
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{ ml: 1 }}
                                    >
                                        {new Date(comment.createdAt).toLocaleString()}
                                    </Typography>
                                )}
                            </Typography>
                            <Typography sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>
                                {comment.body}
                            </Typography>
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
                <Avatar sx={{ width: 32, height: 32, fontSize: 14 }}>
                    {initialOf(authorLabel)}
                </Avatar>
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <TextField
                        placeholder="Leave a comment"
                        multiline
                        minRows={3}
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        disabled={submitting}
                        size="small"
                    />
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                            gap: 1,
                        }}
                    >
                        {canChoose && onChoose && (
                            <Button
                                variant="contained"
                                size="small"
                                disabled={choosingDisabled}
                                onClick={onChoose}
                                sx={{ textTransform: 'none', fontWeight: 600 }}
                            >
                                + choice
                            </Button>
                        )}
                        <Button
                            variant="contained"
                            size="small"
                            disabled={submitting || !draft.trim()}
                            onClick={() => {
                                void handleSubmit()
                            }}
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
