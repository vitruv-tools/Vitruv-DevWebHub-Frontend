import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material'
import type { Property, StructuredResource, StructuredSimpleReference } from '../../../types/structured-resource.ts'
import type { EditViewAction } from '../../../state/edit-view-actions.ts'
import { isNil, isNotNil } from '../../../../../common/utils/nil-utils.ts'
import { getTypeOutput, structuredResourceShortLabel } from '../../../helpers/display-helpers.ts'
import { PropertyInput } from './inputs/PropertyInput.tsx'
import type { StructuredEcoreClass } from '../../../types/structured-ecore-model.ts'
import type { InputError } from '../../../types/error.ts'

interface Props {
    dispatchEditViewAction: (action: EditViewAction) => boolean
    typesToStructuresResources: Record<string, StructuredResource[]>
    structuredResource: StructuredResource
}

/**
 * The `Editor` component represents a user interface for editing attributes and simple references
 * of a structured resource. It renders a table displaying resource properties and allows users
 * to modify their values via inputs.
 *
 * @param {Object} props - The properties object.
 * @param {function} props.dispatchEditViewAction - A function to dispatch actions related to editing the view.
 * @param {Object} props.structuredResource - The structured resource containing attributes and references to be edited.
 * @param {Object} props.typesToStructuresResources - A mapping used for resolving types to structured resources.
 */
export function Editor(
    {
        dispatchEditViewAction,
        structuredResource,
        typesToStructuresResources,
    }: Props,
) {

    function handleEditAttribute(
        ownerId: string,
        attributeId: string,
        newValue: string | string[] | undefined,
        ignoreInputErrors: boolean,
    ): boolean {

        return dispatchEditViewAction({
            type: 'EDIT_ATTRIBUTE',
            ownerId, attributeId, newValue, ignoreInputErrors,
        })
    }

    function handleEditSimpleReference(
        ownerId: string,
        simpleReferenceId: string,
        newValue: string | string[] | undefined,
        ignoreInputErrors: boolean,
    ) {

        return dispatchEditViewAction({
            type: 'EDIT_SIMPLE_REFERENCE',
            ownerId, simpleReferenceId, newValue, ignoreInputErrors,
        })
    }

    return (
        <TableContainer>
            <Table sx={{ tableLayout: 'fixed' }}>
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ width: '30%', overflow: 'hidden' }}>Name</TableCell>
                        <TableCell sx={{ width: '70%', overflow: 'hidden' }}>Value</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {structuredResource.attributes.map(attr => (
                        <TableRow key={attr.info.name}>
                            <NameCell property={attr} />
                            <TableCell sx={{ width: '70%', overflow: 'hidden' }}>
                                <PropertyInput
                                    disabled={attr.info.isNotEditable}
                                    isArray={attr.info.isArray}
                                    onSubmit={(value, ignoreErrors) =>
                                        handleEditAttribute(
                                            structuredResource.id,
                                            attr.info.id,
                                            value,
                                            ignoreErrors,
                                        )
                                    }
                                    value={attr.value as string[] | undefined}
                                    inputErrors={attr.inputErrors}
                                    options={attr.info.type.literals?.map(lit => ({
                                        key: lit.name,
                                        label: lit.name,
                                    }))}
                                />
                            </TableCell>
                        </TableRow>
                    ))}

                    {structuredResource.simpleReferences.map(sref => (
                        <TableRow key={sref.info.name}>
                            <NameCell property={sref} />

                            <SimpleReferenceValueCell
                                sref={sref}
                                structuredResource={structuredResource}
                                typesToStructuresResources={typesToStructuresResources}
                                handleEditSimpleReference={handleEditSimpleReference}
                            />

                        </TableRow>
                    ))}

                </TableBody>
            </Table>

        </TableContainer>
    )
}

function NameCell({ property }: { property: Property<unknown> }) {
    return (
        <TableCell
            sx={{
                width: '30%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
            }}
        >
            <div><b>{property.info.name}</b></div>
            <span>{getTypeOutput(property.info)}</span>
        </TableCell>
    )
}

function SimpleReferenceValueCell(
    { sref, structuredResource, typesToStructuresResources, handleEditSimpleReference }: {
        sref: StructuredSimpleReference,
        structuredResource: StructuredResource,
        typesToStructuresResources: Record<string, StructuredResource[]>
        handleEditSimpleReference: (ownerId: string, simpleReferenceId: string, newValue: string | string[] | undefined, ignoreInputErrors: boolean) => boolean
    },
) {
    const {
        options,
        someOptionsNotAvailable,
    } = getOptionsFromStructuredResources(sref.info.type, typesToStructuresResources)

    const inputErrors = sref.inputErrors ?? []

    const someOptionsNotAvailableHint: InputError = {
        message: 'There are uncommitted instances that will only become available once committed.',
        severity: 'warn',
    }

    const inputHints = someOptionsNotAvailable
        ? [someOptionsNotAvailableHint, ...inputErrors]
        : sref.inputErrors

    return (
        <TableCell sx={{ width: '70%', overflow: 'hidden' }}>
            <PropertyInput
                disabled={sref.info.isNotEditable}
                isArray={sref.info.isArray}
                onSubmit={(value, ignoreErrors) => handleEditSimpleReference(
                    structuredResource.id,
                    sref.info.id,
                    value,
                    ignoreErrors,
                )}
                value={getCurrentValue(sref)}
                inputErrors={inputHints}
                options={options}
            />
        </TableCell>
    )
}

function getOptionsFromStructuredResources(
    type: StructuredEcoreClass,
    typesToStructuredResources: Record<string, StructuredResource[]>,
): {
    options: { key: string, label: string }[] | undefined,
    someOptionsNotAvailable: boolean,
} {
    let someOptionsNotAvailable = false

    function resToOption(res: StructuredResource) {
        return { key: res.id, label: structuredResourceShortLabel(res) }
    }

    const options = type.subTypes.flatMap(type => {
        const structuredResources = typesToStructuredResources[type.id]
        if (isNil(structuredResources)) {
            return []
        }

        const availableRes = structuredResources.filter(res => isNotNil(res.resourceSetInfo))

        if (availableRes.length < structuredResources.length) {
            someOptionsNotAvailable = true
        }

        return availableRes.map(res => resToOption(res))
    })

    return { options, someOptionsNotAvailable }
}

function getCurrentValue(sref: StructuredSimpleReference) {
    if (sref.value === undefined) {
        return undefined
    }
    if (Array.isArray(sref.value)) {
        return sref.value.map(it => it.id)
    }
    return sref.value.id
}
