import { describe, expect, it } from 'vitest'
import { describeInteractionChoice } from './describe-interaction-choice.ts'
import { formatInconsistencyDescription } from './inconsistency-description.ts'
import { formatResolutionCommentBody } from './format-resolution-comment.ts'
import type { OpenInconsistency } from '../types/open-inconsistency.ts'

describe('describeInteractionChoice', () => {
    it('labels a single-selection answer', () => {
        const interaction = {
            eClass: 'http://vitruv.tools/change/interaction#//MultipleChoiceSingleSelectionUserInteraction',
            message: 'Pick one',
            choices: ['linkComponent', 'deviceComponent'],
        }
        const response = describeInteractionChoice(
            interaction,
            JSON.stringify({ eClass: interaction.eClass, selectedIndex: 1 }),
        )
        expect(response).toBe('deviceComponent')
    })
})

describe('formatResolutionCommentBody', () => {
    it('includes resolver and selected choice', () => {
        const body = formatResolutionCommentBody({
            resolvedBy: 'Demo User',
            choice: 'Periodic Task',
            comment: 'Matches period',
        })
        expect(body).toContain('Resolved this inconsistency.')
        expect(body).toContain('Resolver: Demo User')
        expect(body).toContain('Selected choice: Periodic Task')
        expect(body).toContain('Resolution message: Matches period')
    })

    it('omits optional comment line when blank', () => {
        const body = formatResolutionCommentBody({
            resolvedBy: 'Demo User',
            choice: 'Yes',
        })
        expect(body).not.toContain('Resolution message:')
    })
})

describe('formatInconsistencyDescription', () => {
    it('includes resolution details when resolved', () => {
        const item: OpenInconsistency = {
            id: '1',
            vsumId: 'v',
            taskId: 't',
            viewId: 'view',
            title: 'Pick type',
            message: 'Select the component type',
            state: 'RESOLVED',
            resolvedAt: '2026-09-02T10:37:06.000Z',
            resolvedBy: 'Demo User',
            resolutionChoice: 'linkComponent',
            resolutionComment: 'Matches architecture',
        }

        const text = formatInconsistencyDescription(item)
        expect(text).toContain('Select the component type')
        expect(text).toContain('Resolved at:')
        expect(text).toContain('Resolved by: Demo User')
        expect(text).toContain('Choice: linkComponent')
        expect(text).toContain('Comment: Matches architecture')
    })

    it('omits comment line when no comment was provided', () => {
        const item: OpenInconsistency = {
            id: '1',
            vsumId: 'v',
            taskId: 't',
            viewId: 'view',
            title: 'Pick type',
            message: 'Select the component type',
            state: 'RESOLVED',
            resolvedBy: 'Demo User',
            resolutionChoice: 'linkComponent',
        }

        const text = formatInconsistencyDescription(item)
        expect(text).not.toContain('Comment:')
        expect(text).not.toContain('Resolved at:')
    })
})
