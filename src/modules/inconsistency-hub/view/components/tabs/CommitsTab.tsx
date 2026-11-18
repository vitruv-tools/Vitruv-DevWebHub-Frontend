import { Box, List, ListItem, ListItemText, Typography } from '@mui/material'
import { useAsyncData } from '../../../../../common/hooks/useAsyncData.ts'
import type { VitruviusClient } from '../../../../model-editor/infra/vitruvius-client.ts'
import { listInconsistencyViewUpdates } from '../../../api/inconsistency-api.ts'
import type { ViewUpdateSummary } from '../../../types/open-inconsistency.ts'

type Props = {
    client: VitruviusClient
    inconsistencyId: string
}

const NO_UPDATES: ViewUpdateSummary[] = []

export function CommitsTab({ client, inconsistencyId }: Props) {
    const {
        data: updates,
        loading,
        error,
    } = useAsyncData(
        () => listInconsistencyViewUpdates(client, inconsistencyId),
        [client, inconsistencyId],
        NO_UPDATES,
    )

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
