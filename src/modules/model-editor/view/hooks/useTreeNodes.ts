import type { TreeNode } from '../../types/tree-node.ts'
import { useMemo } from 'react'
import { EcoreModelToTreeConverter } from '../../converter/ecore-model-tree-converter.ts'
import { ResourcesStructuredToTreeConverter } from '../../converter/resources-structured-to-tree-converter.ts'
import type { ViewLogic } from './useViewLogic.ts'
import { isNotNil } from '../../../../common/utils/nil-utils.ts'

/**
 * Generates and provides tree node structures based on the provided view logic.
 *
 * @param {ViewLogic} viewLogic - The logic containing the view details used to compute tree nodes for ecore models and structured resources.
 * @return {Object} An object containing two tree node arrays:
 * - ecoreModelTreeNodes: An array of tree nodes converted from ecore models.
 * - vsumTreeNodes: An array of tree nodes converted from structured resources.
 */
export function useTreeNodes(
    viewLogic: ViewLogic,
): {
    ecoreModelTreeNodes: TreeNode[],
    vsumTreeNodes: TreeNode[]
} {
    const ecoreModelTreeNodes: TreeNode[] = useMemo(() =>
            isNotNil(viewLogic.view)
                ? viewLogic.view.ecoreModels.flatMap(it => new EcoreModelToTreeConverter().convert(it))
                : [],
        [viewLogic.view],
    )

    const vsumTreeNodes: TreeNode[] = useMemo(() =>
            isNotNil(viewLogic.view)
                ? new ResourcesStructuredToTreeConverter().convert(
                    viewLogic.view.structuredResources,
                    viewLogic.dispatchEditViewAction,
                )
                : [],
        [viewLogic.view],
    )

    return { ecoreModelTreeNodes, vsumTreeNodes }
}
