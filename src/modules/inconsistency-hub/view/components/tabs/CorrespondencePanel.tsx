import { Box, ButtonBase, Typography } from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import type { StructuredResource } from '../../../../model-editor/types/structured-resource.ts'
import { structuredResourceLabel } from '../../../../model-editor/helpers/display-helpers.ts'

type Props = {
    selectedResource?: StructuredResource
    linkedResources: StructuredResource[]
    /** Panel stays inactive until the user selects an element (blue highlight). */
    userHasSelection: boolean
    onSelectResource?: (resourceId: string) => void
}

/**
 * Shows only the selected element and its linked correspondences (clickable).
 */
export function CorrespondencePanel({
    selectedResource,
    linkedResources,
    userHasSelection,
    onSelectResource,
}: Props) {
    if (!userHasSelection || !selectedResource) {
        return null
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6, p: 0.75 }}>
            <Typography variant='caption' sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                Correspondences
            </Typography>

            <Box
                sx={{
                    border: 1.5,
                    borderColor: 'primary.main',
                    borderRadius: 1,
                    px: 0.75,
                    py: 0.5,
                    bgcolor: 'action.selected',
                }}
            >
                <Typography
                    variant='caption'
                    sx={{ fontWeight: 700, color: 'primary.light', lineHeight: 1.25, wordBreak: 'break-word' }}
                >
                    {structuredResourceLabel(selectedResource)}
                </Typography>
            </Box>

            {linkedResources.map(resource => (
                <ButtonBase
                    key={resource.id}
                    onClick={() => onSelectResource?.(resource.id)}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        px: 0.75,
                        py: 0.45,
                        width: '100%',
                        textAlign: 'left',
                        justifyContent: 'flex-start',
                        '&:hover': {
                            borderColor: 'primary.main',
                            bgcolor: 'action.hover',
                        },
                    }}
                >
                    <ArrowForwardIcon sx={{ fontSize: 14 }} color='primary' />
                    <Typography
                        variant='caption'
                        sx={{ flex: 1, fontWeight: 600, lineHeight: 1.25, wordBreak: 'break-word' }}
                    >
                        {structuredResourceLabel(resource)}
                    </Typography>
                </ButtonBase>
            ))}
        </Box>
    )
}
