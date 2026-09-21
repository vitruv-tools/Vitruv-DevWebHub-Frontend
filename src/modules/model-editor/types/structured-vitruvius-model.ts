import type { StructuredEcoreModel } from './structured-ecore-model.ts'
import type { StructuredResource } from './structured-resource.ts'
import type { InputError } from './error.ts'

export interface Vsum {
    metamodelName: string
    ecoreModels: StructuredEcoreModel[]
    id: string
    name: string
    description: string
}

export interface View {
    id: string
    ecoreModels: StructuredEcoreModel[]
    structuredResources: StructuredResource[]
    inputErrors?: InputError[]
}
