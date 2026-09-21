import { Divider, Paper } from '@mui/material'
import { ColumnLayout, RowLayout } from './flex.tsx'
import type { ReactNode } from 'react'
import { isNotNil } from '../utils/nil-utils.ts'

interface Props {
    title?: ReactNode
    headerWidgets?: ReactNode
    children: ReactNode
}


/**
 * Renders a base frame layout that includes a title, optional header widgets,
 * and children content, with a styled paper container and layout structure.
 *
 * @param {Object} props - The properties passed to the BaseFrame component.
 * @param {ReactNode} props.title - The title to display in the header of the frame.
 * @param {React.ReactNode} props.headerWidgets - Additional widgets or components to display in the header alongside the title.
 * @param {React.ReactNode} props.children - The content to render within the main body of the frame.
 */
export function BaseFrame({ title, headerWidgets, children }: Props) {
    return (
        <Paper elevation={0} sx={{ height: '100%', width: '100%', padding: 1, borderRadius: 3 }}>
            <ColumnLayout sx={{ gap: 1 }}>
                {isNotNil(title) && (
                    <>
                        <RowLayout sx={{ height: 'unset', alignItems: 'center', minWidth: 0, flexShrink: 0 }}>
                            <RowLayout
                                sx={{
                                    overflowX: 'auto',
                                    flexWrap: 'nowrap',
                                    whiteSpace: 'nowrap',
                                    alignItems: 'center',
                                    minWidth: 0,
                                    msOverflowStyle: 'none',
                                    scrollbarWidth: 'none',
                                    '&::-webkit-scrollbar': {
                                        display: 'none',
                                    },
                                }}
                            >
                                {title}
                            </RowLayout>
                            {headerWidgets}
                        </RowLayout>
                        <Divider />
                    </>
                )}
                {children}
            </ColumnLayout>
        </Paper>
    )
}
