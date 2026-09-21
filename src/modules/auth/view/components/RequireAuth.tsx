import { CircularProgress, Box } from '@mui/material'
import type { ReactNode } from 'react'
import { useAuth } from '../../context/AuthContext.tsx'
import { AuthPage } from './AuthPage.tsx'

type Props = {
    children: ReactNode
}

/**
 * Renders children only when authenticated; otherwise shows sign-in / sign-up.
 */
export function RequireAuth({ children }: Props) {
    const { isAuthenticated, isLoading } = useAuth()

    if (isLoading) {
        return (
            <Box
                sx={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    bgcolor: 'background.default',
                }}
            >
                <CircularProgress />
            </Box>
        )
    }

    if (!isAuthenticated) {
        return <AuthPage />
    }

    return <>{children}</>
}
