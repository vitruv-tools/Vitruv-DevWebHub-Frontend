import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react'
import { useAuth } from '../../auth/context/AuthContext.tsx'
import {
    listKnowledgeMetamodels,
    persistProfileToken,
    syncUserSession,
    updateUserMetamodels,
    type KnowledgeMetamodel,
} from '../api/user-api.ts'
import { ModelKnowledgeDialog } from '../view/ModelKnowledgeDialog.tsx'

type ModelKnowledgeContextValue = {
    catalog: KnowledgeMetamodel[]
    catalogLoading: boolean
    catalogError: string | null
    knownMetamodels: string[]
    settingsOpen: boolean
    openSettings: () => void
    closeSettings: () => void
    reloadCatalog: () => Promise<void>
    saveMetamodels: (metamodels: string[]) => Promise<void>
}

const ModelKnowledgeContext = createContext<ModelKnowledgeContextValue | undefined>(undefined)

type Props = {
    children: ReactNode
}

function isAbortError(error: unknown): boolean {
    return error instanceof Error && error.name === 'AbortError'
}

function errorMessage(error: unknown): string {
    if (error instanceof Error && error.message.trim()) {
        return error.message
    }
    return 'Request failed'
}

export function ModelKnowledgeProvider({ children }: Props) {
    const { user } = useAuth()
    const [catalog, setCatalog] = useState<KnowledgeMetamodel[]>([])
    const [catalogLoading, setCatalogLoading] = useState(true)
    const [catalogError, setCatalogError] = useState<string | null>(null)
    const [knownMetamodels, setKnownMetamodels] = useState<string[]>([])
    const [settingsOpen, setSettingsOpen] = useState(false)

    const loadCatalog = useCallback(async (signal?: AbortSignal) => {
        setCatalogLoading(true)
        setCatalogError(null)
        try {
            const available = await listKnowledgeMetamodels(signal)
            if (signal?.aborted) {
                return
            }
            setCatalog(available)
        } catch (error) {
            if (isAbortError(error) || signal?.aborted) {
                return
            }
            console.error('Could not load metamodels:', error)
            setCatalogError(errorMessage(error))
        } finally {
            if (!signal?.aborted) {
                setCatalogLoading(false)
            }
        }
    }, [])

    useEffect(() => {
        if (!user?.username) {
            setKnownMetamodels([])
            setCatalog([])
            setCatalogError(null)
            setCatalogLoading(false)
            return
        }

        const controller = new AbortController()
        const current = user

        async function load() {
            try {
                const profile = await syncUserSession({
                    username: current.username,
                    name: current.name,
                    email: current.email,
                }, controller.signal)
                if (controller.signal.aborted) {
                    return
                }
                persistProfileToken(profile)
                setKnownMetamodels(profile.metamodels ?? [])
            } catch (error) {
                if (isAbortError(error) || controller.signal.aborted) {
                    return
                }
                console.error('Could not store the user profile:', error)
            }

            await loadCatalog(controller.signal)
        }

        void load()
        return () => {
            controller.abort()
        }
    }, [user, loadCatalog])

    const saveMetamodels = useCallback(async (metamodels: string[]) => {
        if (!user?.username) {
            throw new Error('Sign in before choosing metamodels.')
        }
        const profile = await updateUserMetamodels(user.username, metamodels)
        setKnownMetamodels(profile.metamodels ?? [])
    }, [user])

    const value = useMemo<ModelKnowledgeContextValue>(() => ({
        catalog,
        catalogLoading,
        catalogError,
        knownMetamodels,
        settingsOpen,
        openSettings: () => setSettingsOpen(true),
        closeSettings: () => setSettingsOpen(false),
        reloadCatalog: () => loadCatalog(),
        saveMetamodels,
    }), [catalog, catalogLoading, catalogError, knownMetamodels, settingsOpen, loadCatalog, saveMetamodels])

    return (
        <ModelKnowledgeContext.Provider value={value}>
            {children}
            <ModelKnowledgeDialog
                open={settingsOpen}
                catalog={catalog}
                catalogLoading={catalogLoading}
                catalogError={catalogError}
                knownMetamodels={knownMetamodels}
                onClose={() => setSettingsOpen(false)}
                onRetry={() => { void loadCatalog() }}
                onSave={saveMetamodels}
            />
        </ModelKnowledgeContext.Provider>
    )
}

export function useModelKnowledge(): ModelKnowledgeContextValue {
    const context = useContext(ModelKnowledgeContext)
    if (!context) {
        throw new Error('useModelKnowledge must be used within a ModelKnowledgeProvider')
    }
    return context
}
