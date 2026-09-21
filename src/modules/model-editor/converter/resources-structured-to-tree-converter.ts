import type { StructuredResource } from '../types/structured-resource.ts'
import type { TreeNode, TreeNodeOption } from '../types/tree-node.ts'
import { structuredResourceLabel } from '../helpers/display-helpers.ts'
import type { EditViewAction } from '../state/edit-view-actions.ts'
import { normalizeAsArray } from '../../../common/utils/array-utils.ts'
import { match } from '../helpers/structured-resource-helpers.ts'

/**
 * This class is responsible for converting structured resource data into a tree representation.
 * It maps structured resources to tree nodes, allowing for hierarchical rendering and manipulation
 * of resources and their containment references.
 */
export class ResourcesStructuredToTreeConverter {
    convert(
        structuredResources: StructuredResource | StructuredResource[],
        dispatch: (editViewAction: EditViewAction) => void,
    ): TreeNode[] {
        return normalizeAsArray(structuredResources).map(resource => this.convertOne(resource, dispatch))
    }

    private convertOne(resource: StructuredResource, dispatch: (editViewAction: EditViewAction) => void): TreeNode {

        const options: TreeNodeOption[] = resource.containmentReferences.flatMap(cref => {
            return cref.info.type.subTypes.filter(type => type.canInstantiate).map(type => {
                const disabled = match(
                    cref.value,
                    nil => false,
                    single => true,
                    array => array.length >= cref.info.maxItems,
                    cref.info.isArray,
                )

                return {
                    key: cref.info.id + type.id,
                    label: `${cref.info.name} : ${type.name}`,
                    disabled,
                    onClick: () => dispatch({
                        type: 'ADD_CONTAINMENT_REFERENCE',
                        ownerId: resource.id,
                        containmentReferenceId: cref.info.id,
                        dataTypeId: type.id,
                        ignoreInputErrors: false,
                    }),
                }

            })
        })

        const children: TreeNode[] = resource.containmentReferences
            .flatMap(ref => ref.value ? this.convert(ref.value, dispatch) : [])

        return {
            id: resource.id,
            label: structuredResourceLabel(resource),
            children, options,
            inputErrorSeverity: resource.propertiesWithErrors.length > 0 ? 'reject' : undefined,
        }
    }
}