import type { UserInteractionPayload } from '../types/api-propagation-task.ts'

function interactionType(eClass: string): string {
    if (eClass.includes('ConfirmationUserInteraction')) {
        return 'confirmation'
    }
    if (eClass.includes('NotificationUserInteraction')) {
        return 'notification'
    }
    if (eClass.includes('FreeTextUserInteraction')) {
        return 'freeText'
    }
    if (eClass.includes('MultipleChoiceMultiSelectionUserInteraction')) {
        return 'multiSelection'
    }
    if (eClass.includes('MultipleChoiceSingleSelectionUserInteraction')) {
        return 'singleSelection'
    }
    return 'unknown'
}

/**
 * Builds the JSON body for POST /v1/tasks/{taskId}/interaction.
 */
export function buildInteractionResponse(
    interaction: UserInteractionPayload,
    userValue: boolean | string | number | number[],
): string {
    const base: UserInteractionPayload = {
        eClass: interaction.eClass,
        message: interaction.message,
    }

    switch (interactionType(interaction.eClass)) {
        case 'confirmation':
            return JSON.stringify({ ...base, confirmed: userValue as boolean })
        case 'notification':
            return JSON.stringify(base)
        case 'freeText':
            return JSON.stringify({ ...base, text: userValue as string })
        case 'singleSelection':
            return JSON.stringify({ ...base, selectedIndex: userValue as number })
        case 'multiSelection':
            return JSON.stringify({ ...base, selectedIndices: userValue as number[] })
        default:
            throw new Error(`Unsupported user interaction type: ${interaction.eClass}`)
    }
}

export function getInteractionKind(interaction: UserInteractionPayload): string {
    return interactionType(interaction.eClass)
}
