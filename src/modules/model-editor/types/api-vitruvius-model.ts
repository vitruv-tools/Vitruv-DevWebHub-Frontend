import type { StructuredEcoreModel } from './structured-ecore-model.ts'

export interface VsumDto {
    id: string
    metamodelName: string
    name: string
    description: string
    // viewTypes?: ViewTypeDto[]
}

export interface ViewTypeDto {
    name: string
    selector?: SelectorDto
}

export interface SelectorDto {
    id: string
    selectableObjects: SelectableObjectDto[]
}

export interface SelectableObjectDto {
    _id: string
    eClass: string
}

export interface View {
    id: string
    ecoreModels: StructuredEcoreModel[]
    resourceSet: any[]
}