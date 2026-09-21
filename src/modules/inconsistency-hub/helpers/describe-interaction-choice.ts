import type { UserInteractionPayload } from '../../model-editor/types/api-propagation-task.ts'
import { getInteractionKind } from '../../model-editor/helpers/build-interaction-response.ts'

/**
 * Human-readable label for the answer submitted to a propagation interaction.
 */
export function describeInteractionChoice(
    interaction: UserInteractionPayload,
    responseJson: string,
): string {
    const response = JSON.parse(responseJson) as Record<string, unknown>
    const kind = getInteractionKind(interaction)

    switch (kind) {
        case 'singleSelection': {
            const index = Number(response.selectedIndex)
            return interaction.choices?.[index] ?? String(index)
        }
        case 'multiSelection': {
            const indices = Array.isArray(response.selectedIndices)
                ? response.selectedIndices.map(value => Number(value))
                : []
            return indices
                .map(index => interaction.choices?.[index] ?? String(index))
                .join(', ')
        }
        case 'confirmation':
            return response.confirmed ? 'Yes' : 'No'
        case 'freeText':
            return typeof response.text === 'string' ? response.text : ''
        case 'notification':
            return 'Acknowledged'
        default:
            return '—'
    }
}
