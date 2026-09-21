import type { StructuredEcoreClass, StructuredEcorePropertyInfo } from './structured-ecore-model.ts'
import type { InputError } from './error.ts'

export type StructuredResource = {
    id: string
    type: StructuredEcoreClass
    attributes: StructuredAttribute[]
    simpleReferences: StructuredSimpleReference[]
    containmentReferences: StructuredContainmentReference[]
    resourceSetInfo: ResourceSetInfo | undefined // undefined if not loaded from vitruvius but created locally
    propertiesWithErrors: string[]
    parentId: string | undefined
}

export type StructuredAttribute = Property<string>
export type StructuredSimpleReference = Property<StructuredResource>
export type StructuredContainmentReference = Property<StructuredResource>

export type Property<T> = {
    value: T | T[] | undefined
    info: StructuredEcorePropertyInfo
    inputErrors?: InputError[]
}

export type ResourceSetInfo = {
    uri?: string
    eClass?: string
    _id: string
}