import type { OpenInconsistency } from '../types/open-inconsistency.ts'
import type { UserInteractionPayload } from '../../model-editor/types/api-propagation-task.ts'

/**
 * Formats the hub description block: original inconsistency prompt plus resolution record.
 */
export function formatInconsistencyDescription(item: OpenInconsistency): string {
    const lines: string[] = []

    if (item.message) {
        lines.push(item.message)
    }

    if (item.interaction && 'choices' in item.interaction && Array.isArray(item.interaction.choices)) {
        lines.push('\nOptions:')
        let i:number = 1
        for (const option of item.interaction.choices) {
            lines.push(i+":  "+option)
            i = i+1
        }
    }

    if (item.state === 'RESOLVED' && item.resolvedBy) {
        if (lines.length > 0) {
            lines.push('')
        }
        lines.push('— Resolution —')
        if (item.resolvedAt) {
            lines.push(`Resolved at: ${new Date(item.resolvedAt).toLocaleString()}`)
        }
        lines.push(`Resolved by: ${item.resolvedBy}`)
        if (item.resolutionChoice) {
            lines.push(`Choice: ${item.resolutionChoice}`)
        }
        if (item.resolutionComment) {
            lines.push(`Comment: ${item.resolutionComment}`)
        }
    }

    return lines.length > 0 ? lines.join('\n') : '—'
}
