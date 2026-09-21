type EditAttributeAction = {
    type: 'EDIT_ATTRIBUTE'
    ownerId: string
    attributeId: string
    newValue: string | string[] | undefined
    ignoreInputErrors: boolean
}

type EditSimpleReferenceAction = {
    type: 'EDIT_SIMPLE_REFERENCE'
    ownerId: string
    simpleReferenceId: string
    newValue: string | string[] | undefined
    ignoreInputErrors: boolean
}

type AddContainmentReferenceAction = {
    type: 'ADD_CONTAINMENT_REFERENCE'
    ownerId: string
    containmentReferenceId: string
    dataTypeId: string
    ignoreInputErrors: boolean
}

type RemoveContainmentReferenceAction = {
    type: 'REMOVE_CONTAINMENT_REFERENCE'
    ownerId: string
    containmentReferenceId: string
    ignoreInputErrors: boolean
}

export type EditViewAction =
    | EditAttributeAction
    | EditSimpleReferenceAction
    | AddContainmentReferenceAction
    | RemoveContainmentReferenceAction
