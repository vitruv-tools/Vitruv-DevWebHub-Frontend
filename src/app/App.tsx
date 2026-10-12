import { useState } from 'react'
import { ModelManagerPage } from '../modules/model-editor/view/components/editor/ModelManagerPage.tsx'
import { InconsistencyHubPage } from '../modules/inconsistency-hub/view/components/InconsistencyHubPage.tsx'
import { ConfirmDialogProvider } from '../common/systems/confirm-dialog/ConfirmDialogProvider.tsx'
import { NotificationProvider } from '../common/systems/notification/NotificationProvider.tsx'
import { AuthProvider } from '../modules/auth/context/AuthContext.tsx'
import { RequireAuth } from '../modules/auth/view/components/RequireAuth.tsx'
import { ModelKnowledgeProvider } from '../modules/users/context/ModelKnowledgeContext.tsx'
import { ErrorBoundary } from './ErrorBoundary.tsx'

type AppPage = 'editor' | 'hub'

export function App() {
    const [page, setPage] = useState<AppPage>('editor')

    return (
        <ErrorBoundary>
            <AuthProvider>
                <ConfirmDialogProvider>
                    <NotificationProvider>
                        <RequireAuth>
                            <ModelKnowledgeProvider>
                                {page === 'hub' ? (
                                    <InconsistencyHubPage onBack={() => setPage('editor')} />
                                ) : (
                                    <ModelManagerPage onOpenHub={() => setPage('hub')} />
                                )}
                            </ModelKnowledgeProvider>
                        </RequireAuth>
                    </NotificationProvider>
                </ConfirmDialogProvider>
            </AuthProvider>
        </ErrorBoundary>
    )
}
