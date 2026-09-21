import type { EditViewAction } from './edit-view-actions.ts'
import type { StructuredEcoreModel } from '../types/structured-ecore-model.ts'

export type ManageViewAction =
    | { type: 'CLEAR_VIEW' }
    | { type: 'SET_VIEW', id: string, resourceSet: any[], ecoreModels: StructuredEcoreModel[] }
    | { type: 'EDIT_VIEW', editViewAction: EditViewAction }
