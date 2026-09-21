import { styled } from '@mui/material'
import Box from '@mui/material/Box'

export const RowLayout = styled(Box)`
    display: flex;
    flex-direction: row;
    width: 100%;
    height: 100%;
    background: none;
    overflow: hidden;
`

export const ColumnLayout = styled(Box)`
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    background: none;
    overflow: hidden;
`

export function Spacer() {
    return <Box flex={1} />
}
