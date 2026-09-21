import type { StructuredResource } from '../../../types/structured-resource.ts'
import type { EditViewAction } from '../../../state/edit-view-actions.ts'
import { isNil } from '../../../../../common/utils/nil-utils.ts'
import { Editor } from './Editor.tsx'
import { ColumnLayout } from '../../../../../common/components/flex.tsx'

interface Props {
    dispatchEditViewAction: (action: EditViewAction) => boolean
    typesToStructuresResources: Record<string, StructuredResource[]>
    structuredResource: StructuredResource | undefined
}

/**
 * A functional component that wraps an editor, conditionally rendering a placeholder message when no structured resource is provided.
 *
 * @param {Object} props An object containing the required properties.
 * @param {Function} props.dispatchEditViewAction A function to dispatch actions for editing the view.
 * @param {Object|null} props.structuredResource The resource to be edited. If null or undefined, a placeholder message is displayed.
 * @param {Object} props.typesToStructuresResources A mapping of types to their corresponding structured resources.
 */
export function EditorWrapper(
    {
        dispatchEditViewAction,
        structuredResource,
        typesToStructuresResources,
    }: Props,
) {

    if (isNil(structuredResource)) {
        return (
            <ColumnLayout sx={{ alignItems: 'center', justifyContent: 'center' }}>
                No resource selected
            </ColumnLayout>
        )
    }

    return (
        <Editor
            dispatchEditViewAction={dispatchEditViewAction}
            structuredResource={structuredResource}
            typesToStructuresResources={typesToStructuresResources}
        />
    )
}
