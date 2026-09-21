import { describe, expect, it } from 'vitest'
import { buildInteractionResponse, getInteractionKind } from './build-interaction-response.ts'

const confirmationInteraction = {
    eClass: 'http://vitruv.tools/change/interaction#//ConfirmationUserInteraction',
    message: 'Proceed?',
}

describe('buildInteractionResponse', () => {
    it('builds confirmation response', () => {
        const json = buildInteractionResponse(confirmationInteraction, true)
        const parsed = JSON.parse(json)
        expect(parsed.confirmed).toBe(true)
        expect(parsed.message).toBe('Proceed?')
        expect(getInteractionKind(confirmationInteraction)).toBe('confirmation')
    })

    it('builds single selection response', () => {
        const interaction = {
            eClass: 'http://vitruv.tools/change/interaction#//MultipleChoiceSingleSelectionUserInteraction',
            message: 'Pick one',
            choices: ['A', 'B'],
        }
        const json = buildInteractionResponse(interaction, 1)
        expect(JSON.parse(json).selectedIndex).toBe(1)
    })
})
