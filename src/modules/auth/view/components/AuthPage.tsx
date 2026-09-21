import { useState } from 'react'
import { SignInPage } from './SignInPage.tsx'
import { SignUpPage } from './SignUpPage.tsx'

type AuthMode = 'signin' | 'signup'

type Props = {
    onAuthenticated?: () => void
}

/**
 * Entry auth screen shown before editor / hub access.
 */
export function AuthPage({ onAuthenticated }: Props) {
    const [mode, setMode] = useState<AuthMode>('signin')

    if (mode === 'signup') {
        return (
            <SignUpPage
                onSuccess={onAuthenticated}
                onSwitchToSignIn={() => setMode('signin')}
            />
        )
    }

    return (
        <SignInPage
            onSuccess={onAuthenticated}
            onSwitchToSignUp={() => setMode('signup')}
        />
    )
}
