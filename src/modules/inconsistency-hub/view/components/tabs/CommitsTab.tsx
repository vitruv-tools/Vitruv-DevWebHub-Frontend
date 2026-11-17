import { useEffect, useState } from 'react'
import { useOnChange } from '../../../../../common/hooks/useOnChange.ts'
import { Box, List, ListItem, ListItemText, Typography } from '@mui/material'
import type { VitruviusClient } from '../../../../model-editor/infra/vitruvius-client.ts'
import { listInconsistencyViewUpdates } from '../../../api/inconsistency-api.ts'
import type { ViewUpdateSummary } from '../../../types/open-inconsistency.ts'

type Props = {
    client: VitruviusClient
    inconsistencyId: string
}

export function CommitsTab({ client, inconsistencyId }: Props) {
    const [updates, setUpdates] = useState<ViewUpdateSummary[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useOnChange([client, inconsistencyId], () => {
        setLoading(true)
        setError(null)
    })

    useEffect(() => {
        let ignore = false
        listInconsistencyViewUpdates(client, inconsistencyId)
            .then((result) => {
                if (!ignore) setUpdates(result)
            })
            .catch((err: unknown) => {
                if (!ignore) setError(err instanceof Error ? err.message : String(err))
            })
            .finally(() => {
                if (!ignore) setLoading(false)
            })
        return () => {
            ignore = true
        }
    }, [client, inconsistencyId])

    return (
        <Box>
            {loading && <Typography color="text.secondary">Loading…</Typography>}
            {error && <Typography color="error">{error}</Typography>}
            {!loading && updates.length === 0 && null}
            <List dense>
                {updates.map((update) => (
                    <ListItem key={update.id} divider alignItems="flex-start">
                        <ListItemText
                            primary={update.viewTypeName || 'View update'}
                            secondary={
                                <>
                                    {update.timestamp
                                        ? new Date(update.timestamp).toLocaleString()
                                        : 'No timestamp'}
                                    {' · '}
                                    snapshot {update.resourceSetLength} chars
                                    {update.selectedObjectEClassNames &&
                                        update.selectedObjectEClassNames.length > 0 &&
                                        ` · ${update.selectedObjectEClassNames.join(', ')}`}
                                </>
                            }
                        />
                    </ListItem>
                ))}
            </List>
        </Box>
    )
}
