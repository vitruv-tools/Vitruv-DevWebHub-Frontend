import { useState, type FormEvent } from 'react'
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Divider,
    Link,
    Paper,
    TextField,
    Typography,
} from '@mui/material'
import { useAuth } from '../../context/AuthContext.tsx'
import { DEMO_PASSWORD, DEMO_USERNAME } from '../../demo-credentials.ts'

type Props = {
    onSuccess?: () => void
    onCancel?: () => void
    onSwitchToSignUp?: () => void
}

/**
 * Core sign-in form (MUI). Sign-up / forgot-password live under future/ later.
 * Fills the app root so background matches the editor (no side strips).
 */
export function SignInPage({ onSuccess, onCancel, onSwitchToSignUp }: Props) {
    const { signIn } = useAuth()
    const [username, setUsername] = useState(DEMO_USERNAME)
    const [password, setPassword] = useState(DEMO_PASSWORD)
    const [error, setError] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)

    async function handleSubmit(event: FormEvent) {
        event.preventDefault()
        if (!username.trim() || !password) {
            setError('Please enter username and password.')
            return
        }

        setSubmitting(true)
        setError(null)
        try {
            await signIn(username.trim(), password)
            onSuccess?.()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Sign in failed.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Box
            sx={{
                width: '100%',
                height: '100%',
                minHeight: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 2,
                bgcolor: 'background.default',
                boxSizing: 'border-box',
            }}
        >
            <Paper
                elevation={0}
                sx={{
                    p: 3,
                    width: '100%',
                    maxWidth: 420,
                    borderRadius: 3,
                    border: 1,
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                }}
            >
                <Typography variant='h5' sx={{ fontWeight: 600, mb: 0.5 }}>
                    Sign in
                </Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                    Sign in to access the editor and Inconsistency Hub.
                </Typography>

                <Alert severity='info' sx={{ mb: 2 }}>
                    Demo credentials:{' '}
                    <Box component='span' sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                        {DEMO_USERNAME}
                    </Box>
                    {' / '}
                    <Box component='span' sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                        {DEMO_PASSWORD}
                    </Box>
                </Alert>

                <Divider sx={{ mb: 2 }} />

                <Box component='form' onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                        label='Username or email'
                        name='username'
                        value={username}
                        onChange={e => {
                            setUsername(e.target.value)
                            if (error) setError(null)
                        }}
                        autoComplete='username'
                        autoFocus
                        fullWidth
                        disabled={submitting}
                    />
                    <TextField
                        label='Password'
                        name='password'
                        type='password'
                        value={password}
                        onChange={e => {
                            setPassword(e.target.value)
                            if (error) setError(null)
                        }}
                        autoComplete='current-password'
                        fullWidth
                        disabled={submitting}
                    />

                    {error && <Alert severity='error'>{error}</Alert>}

                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                        {onCancel && (
                            <Button onClick={onCancel} disabled={submitting}>
                                Cancel
                            </Button>
                        )}
                        <Button type='submit' variant='contained' disabled={submitting}>
                            {submitting ? <CircularProgress size={20} color='inherit' /> : 'Sign in'}
                        </Button>
                    </Box>
                </Box>

                {onSwitchToSignUp && (
                    <Typography variant='body2' color='text.secondary' sx={{ mt: 2, textAlign: 'center' }}>
                        Need an account?{' '}
                        <Link
                            component='button'
                            type='button'
                            onClick={onSwitchToSignUp}
                            sx={{ verticalAlign: 'baseline' }}
                        >
                            Sign up
                        </Link>
                    </Typography>
                )}
            </Paper>
        </Box>
    )
}
