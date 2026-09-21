import React, { Component, type ErrorInfo, type ReactNode } from 'react'
import { Box, Button, Paper, Typography } from '@mui/material'
import { RowLayout } from '../common/components/flex.tsx'

interface Props {
    children: ReactNode
}

interface State {
    hasError: boolean
    error?: Error
}

/**
 * A standard React Error Boundary component that catches rendering errors
 * in its child component tree and displays a fallback UI.
 *
 * Uses functionality that is only available in class components, not in functional components.
 */
export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
    }

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo)
    }

    private reload = () => {
        window.location.reload()
    }

    private handleClearAndReload = () => {
        localStorage.clear()
        window.location.reload()
    }

    public render() {
        if (this.state.hasError) {
            return (
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100vh',
                        padding: 3,
                        textAlign: 'center',
                        gap: 2,
                        overflow: 'hidden'
                    }}
                >
                    <Paper
                        elevation={3}
                        sx={{
                            padding: 4,
                            maxWidth: 500,
                            backgroundColor: (theme) => theme.palette.error.dark,
                            color: 'white',
                        }}
                    >
                        <Typography variant='h4' gutterBottom>
                            Something went wrong
                        </Typography>
                        <Typography variant='body1' sx={{ mb: 3 }}>
                            An unexpected error occurred while rendering the application.
                        </Typography>
                        {this.state.error && (
                            <Box
                                sx={{
                                    textAlign: 'left',
                                    mb: 3,
                                    p: 2,
                                    bgcolor: 'rgba(0,0,0,0.1)',
                                    borderRadius: 1,
                                    maxHeight: '200px',
                                    overflow: 'auto',
                                }}
                            >
                                <Typography variant='caption' component='pre' sx={{ fontFamily: 'monospace' }}>
                                    {this.state.error.message}
                                </Typography>
                            </Box>
                        )}


                    </Paper>

                    <RowLayout sx={{ gap: 1, alignItems: 'center', justifyContent: 'flex-end', height: 'unset' }}>
                        <Button
                            variant='outlined'
                            color='error'
                            onClick={this.handleClearAndReload}
                        >
                            Clear caches and reload
                        </Button>
                        <Button
                            variant='contained'
                            color='error'
                            onClick={this.reload}
                        >
                            Just reload
                        </Button>
                    </RowLayout>
                </Box>
            )
        } else {
            return this.props.children
        }
    }
}
