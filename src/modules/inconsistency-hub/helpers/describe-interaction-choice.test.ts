// NOTE: AI-generated test (Claude Code), only lightly reviewed. It asserts current
// behavior; if it conflicts with the requirements, trust the requirements.
// Tests the readable labels for answers to propagation interactions
// (single/multi selection, confirmation, free text, notification, unknown).

import { describe, expect, it } from 'vitest'
import type { UserInteractionPayload } from '../../model-editor/types/api-propagation-task.ts'
import { describeInteractionChoice } from './describe-interaction-choice.ts'

function interaction(eClass: string, choices?: string[]): UserInteractionPayload {
    return { eClass: `interaction#//${eClass}`, choices }
}

describe('describeInteractionChoice', () => {
    const choices = ['Keep', 'Delete', 'Merge']

    it('describes a single selection by its choice label', () => {
        const single = interaction('MultipleChoiceSingleSelectionUserInteraction', choices)
        expect(describeInteractionChoice(single, '{"selectedIndex":1}')).toBe('Delete')
    })

    it('falls back to the index when a single selection has no matching choice', () => {
        const single = interaction('MultipleChoiceSingleSelectionUserInteraction')
        expect(describeInteractionChoice(single, '{"selectedIndex":4}')).toBe('4')
    })

    it('describes a multi selection as a comma separated list', () => {
        const multi = interaction('MultipleChoiceMultiSelectionUserInteraction', choices)
        expect(describeInteractionChoice(multi, '{"selectedIndices":[0,2,7]}')).toBe(
            'Keep, Merge, 7',
        )
    })

    it('describes a multi selection without indices as empty', () => {
        const multi = interaction('MultipleChoiceMultiSelectionUserInteraction', choices)
        expect(describeInteractionChoice(multi, '{}')).toBe('')
    })

    it('describes confirmations as Yes or No', () => {
        const confirmation = interaction('ConfirmationUserInteraction')
        expect(describeInteractionChoice(confirmation, '{"confirmed":true}')).toBe('Yes')
        expect(describeInteractionChoice(confirmation, '{"confirmed":false}')).toBe('No')
    })

    it('returns the free text, or an empty string if there is none', () => {
        const freeText = interaction('FreeTextUserInteraction')
        expect(describeInteractionChoice(freeText, '{"text":"hello"}')).toBe('hello')
        expect(describeInteractionChoice(freeText, '{"text":42}')).toBe('')
    })

    it('describes notifications as acknowledged', () => {
        const notification = interaction('NotificationUserInteraction')
        expect(describeInteractionChoice(notification, '{}')).toBe('Acknowledged')
    })

    it('uses a dash for unknown interaction types', () => {
        expect(describeInteractionChoice(interaction('SomethingElse'), '{}')).toBe('—')
    })
})
