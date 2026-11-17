import { createContext, useContext } from 'react'
import type { KnowledgeMetamodel } from '../api/user-api.ts'

export type ModelKnowledgeContextValue = {
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

export const ModelKnowledgeContext = createContext<ModelKnowledgeContextValue | undefined>(
    undefined,
)

export function useModelKnowledge(): ModelKnowledgeContextValue {
    const context = useContext(ModelKnowledgeContext)
    if (!context) {
        throw new Error('useModelKnowledge must be used within a ModelKnowledgeProvider')
    }
    return context
}
