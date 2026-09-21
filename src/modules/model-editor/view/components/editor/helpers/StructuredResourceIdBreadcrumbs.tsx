import { enumeratePrefixes } from '../../../../../../common/utils/string-utils.ts'
import { Breadcrumbs, Chip } from '@mui/material'

interface Props {
    structuredResourceId: string
    onClick: (structuredResourceId: string) => void
}

/**
 * Renders a breadcrumb navigation component based on a structured resource ID.
 *
 * @param {Object} props - The props passed to the component.
 * @param {string} props.structuredResourceId - A structured resource identifier to generate breadcrumbs from. Segments are split by '/@'.
 * @param {function} props.onClick - A callback function triggered when a breadcrumb item is clicked. The clicked item's resource ID is passed as an argument.
 */
export function StructuredResourceIdBreadcrumbs({ structuredResourceId, onClick }: Props) {

    const ids = enumeratePrefixes(structuredResourceId, '/@')
    const printableIds = structuredResourceId.split('/@')
        .map(it => it.replaceAll(/\.(\d+)/g, '[$1]').replaceAll('//', ''))

    if (ids.length === 0) return <></>

    return (
        <Breadcrumbs
            separator='.'
            sx={{ '& .MuiBreadcrumbs-ol': { flexWrap: 'nowrap' } }}
        >
            {ids.map((id, index) => (
                <Chip
                    size='small'
                    label={printableIds[index]}
                    onClick={() => onClick(id)}
                />
            ))}
        </Breadcrumbs>
    )
}