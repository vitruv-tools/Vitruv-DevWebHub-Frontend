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
import type { SignUpCredentials } from '../../types/auth-types.ts'
import { isPasswordValid, passwordValidationMessage } from '../../utils/password-validation.ts'

type Props = {
    onSuccess?: () => void
    onSwitchToSignIn?: () => void
}

const EMPTY_FORM: SignUpCredentials = {
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    roleType: 'user',
}

/**
 * Sign-up form for creating a new user account (Methodologist API or local fallback).
 */
export function SignUpPage({ onSuccess, onSwitchToSignIn }: Props) {
    const { signUp } = useAuth()
    const [formData, setFormData] = useState<SignUpCredentials>(EMPTY_FORM)
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [info, setInfo] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)

    function updateField<K extends keyof SignUpCredentials>(field: K, value: SignUpCredentials[K]) {
        setFormData(prev => ({ ...prev, [field]: value }))
        if (error) {
            setError(null)
        }
    }

    async function handleSubmit(event: FormEvent) {
        event.preventDefault()

        if (!formData.username.trim() || !formData.email.trim() || !formData.firstName.trim() || !formData.lastName.trim()) {
            setError('Please fill in all required fields.')
            return
        }

        if (!formData.email.includes('@')) {
            setError('Please enter a valid email address.')
            return
        }

        const passwordError = passwordValidationMessage(formData.password)
        if (passwordError) {
            setError(passwordError)
            return
        }

        if (formData.password !== confirmPassword) {
            setError('Passwords do not match.')
            return
        }

        setSubmitting(true)
        setError(null)
        setInfo(null)
        try {
            const response = await signUp({
                ...formData,
                username: formData.username.trim(),
                email: formData.email.trim(),
                firstName: formData.firstName.trim(),
                lastName: formData.lastName.trim(),
            })
            if (response.message) {
                setInfo(response.message)
            }
            onSuccess?.()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Sign up failed.')
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
                    maxWidth: 480,
                    borderRadius: 3,
                    border: 1,
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                }}
            >
                <Typography variant='h5' sx={{ fontWeight: 600, mb: 0.5 }}>
                    Create account
                </Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                    Register a new user ID to access the editor and Inconsistency Hub.
                </Typography>

                <Divider sx={{ mb: 2 }} />

                <Box component='form' onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                        label='Username'
                        value={formData.username}
                        onChange={e => updateField('username', e.target.value)}
                        autoComplete='username'
                        autoFocus
                        fullWidth
                        disabled={submitting}
                        required
                    />
                    <TextField
                        label='Email'
                        type='email'
                        value={formData.email}
                        onChange={e => updateField('email', e.target.value)}
                        autoComplete='email'
                        fullWidth
                        disabled={submitting}
                        required
                    />
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField
                            label='First name'
                            value={formData.firstName}
                            onChange={e => updateField('firstName', e.target.value)}
                            autoComplete='given-name'
                            fullWidth
                            disabled={submitting}
                            required
                        />
                        <TextField
                            label='Last name'
                            value={formData.lastName}
                            onChange={e => updateField('lastName', e.target.value)}
                            autoComplete='family-name'
                            fullWidth
                            disabled={submitting}
                            required
                        />
                    </Box>
                    <TextField
                        label='Password'
                        type='password'
                        value={formData.password}
                        onChange={e => updateField('password', e.target.value)}
                        autoComplete='new-password'
                        fullWidth
                        disabled={submitting}
                        required
                        helperText={
                            formData.password && !isPasswordValid(formData.password)
                                ? 'Use 8+ chars with upper, lower, number, and special character.'
                                : undefined
                        }
                    />
                    <TextField
                        label='Confirm password'
                        type='password'
                        value={confirmPassword}
                        onChange={e => {
                            setConfirmPassword(e.target.value)
                            if (error) {
                                setError(null)
                            }
                        }}
                        autoComplete='new-password'
                        fullWidth
                        disabled={submitting}
                        required
                    />

                    {info && <Alert severity='success'>{info}</Alert>}
                    {error && <Alert severity='error'>{error}</Alert>}

                    <Button type='submit' variant='contained' disabled={submitting}>
                        {submitting ? <CircularProgress size={20} color='inherit' /> : 'Sign up'}
                    </Button>
                </Box>

                {onSwitchToSignIn && (
                    <Typography variant='body2' color='text.secondary' sx={{ mt: 2, textAlign: 'center' }}>
                        Already have an account?{' '}
                        <Link
                            component='button'
                            type='button'
                            onClick={onSwitchToSignIn}
                            sx={{ verticalAlign: 'baseline' }}
                        >
                            Sign in
                        </Link>
                    </Typography>
                )}
            </Paper>
        </Box>
    )
}
