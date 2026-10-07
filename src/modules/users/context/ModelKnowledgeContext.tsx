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
    syncUserSession,
    updateUserMetamodels,
    type KnowledgeMetamodel,
} from '../api/user-api.ts'
import { ModelKnowledgeDialog } from '../view/ModelKnowledgeDialog.tsx'

type ModelKnowledgeContextValue = {
    catalog: KnowledgeMetamodel[]
    knownMetamodels: string[]
    settingsOpen: boolean
    openSettings: () => void
    closeSettings: () => void
    saveMetamodels: (metamodels: string[]) => Promise<void>
}

const ModelKnowledgeContext = createContext<ModelKnowledgeContextValue | undefined>(undefined)

type Props = {
    children: ReactNode
}

export function ModelKnowledgeProvider({ children }: Props) {
    const { user } = useAuth()
    const [catalog, setCatalog] = useState<KnowledgeMetamodel[]>([])
    const [knownMetamodels, setKnownMetamodels] = useState<string[]>([])
    const [settingsOpen, setSettingsOpen] = useState(false)

    useEffect(() => {
        if (!user?.username) {
            setKnownMetamodels([])
            return
        }

        let cancelled = false
        const current = user

        async function load() {
            try {
                const profile = await syncUserSession({
                    username: current.username,
                    name: current.name,
                    email: current.email,
                })
                if (!cancelled) {
                    setKnownMetamodels(profile.metamodels ?? [])
                }
            } catch (error) {
                console.error('Could not store the user profile:', error)
            }

            try {
                const available = await listKnowledgeMetamodels()
                if (!cancelled) {
                    setCatalog(available)
                }
            } catch (error) {
                console.error('Could not load metamodels:', error)
            }
        }

        void load()
        return () => {
            cancelled = true
        }
    }, [user])

    const saveMetamodels = useCallback(async (metamodels: string[]) => {
        if (!user?.username) {
            throw new Error('Sign in before choosing metamodels.')
        }
        const profile = await updateUserMetamodels(user.username, metamodels)
        setKnownMetamodels(profile.metamodels ?? [])
    }, [user])

    const value = useMemo<ModelKnowledgeContextValue>(() => ({
        catalog,
        knownMetamodels,
        settingsOpen,
        openSettings: () => setSettingsOpen(true),
        closeSettings: () => setSettingsOpen(false),
        saveMetamodels,
    }), [catalog, knownMetamodels, settingsOpen, saveMetamodels])

    return (
        <ModelKnowledgeContext.Provider value={value}>
            {children}
            <ModelKnowledgeDialog
                open={settingsOpen}
                catalog={catalog}
                knownMetamodels={knownMetamodels}
                onClose={() => setSettingsOpen(false)}
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
