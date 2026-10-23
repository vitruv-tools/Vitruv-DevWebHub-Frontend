import { describe, expect, it } from 'vitest'
import {
    applySuggestion,
    findActiveMention,
    mentionHint,
    splitByMentions,
    suggestMentions,
    type MentionSuggestion,
} from './mentions.ts'

const candidates: MentionSuggestion[] = [
    { kind: 'USER', name: 'ada', label: 'Ada Lovelace' },
    { kind: 'USER', name: 'grace', label: 'Grace Hopper' },
    { kind: 'USER', name: 'lada', label: 'Lada Niva' },
    { kind: 'METAMODEL', name: 'amalthea', label: 'Amalthea' },
    { kind: 'METAMODEL', name: 'ascet', label: 'Ascet' },
]

describe('findActiveMention', () => {
    it('finds the query before the caret', () => {
        expect(findActiveMention('hello @ad', 9)).toEqual({ start: 6, query: 'ad' })
        expect(findActiveMention('@', 1)).toEqual({ start: 0, query: '' })
        expect(findActiveMention('line one\n@gr there', 12)).toEqual({ start: 9, query: 'gr' })
    })

    it('ignores the text after the caret', () => {
        expect(findActiveMention('hi @ada and more', 6)).toEqual({ start: 3, query: 'ad' })
    })

    it('does not open for emails, finished words or double @', () => {
        expect(findActiveMention('mail me@example', 15)).toBeNull()
        expect(findActiveMention('@ada done', 9)).toBeNull()
        expect(findActiveMention('@@ad', 4)).toBeNull()
        expect(findActiveMention('no tag', 6)).toBeNull()
    })
})

describe('applySuggestion', () => {
    it('replaces the query and puts the caret after the inserted tag', () => {
        const text = 'hi @ad please'
        const active = findActiveMention(text, 6)!
        expect(applySuggestion(text, active, 6, 'ada')).toEqual({ text: 'hi @ada please', caret: 8 })
    })

    it('adds a space at the end of the text', () => {
        const active = findActiveMention('hi @g', 5)!
        expect(applySuggestion('hi @g', active, 5, 'grace')).toEqual({ text: 'hi @grace ', caret: 10 })
    })
})

describe('suggestMentions', () => {
    it('lists everything for an empty query', () => {
        expect(suggestMentions('', candidates).map(item => item.name)).toEqual(
            ['ada', 'grace', 'lada', 'amalthea', 'ascet'],
        )
    })

    it('ranks prefixes before partial matches and matches display names', () => {
        expect(suggestMentions('ad', candidates).map(item => item.name)).toEqual(['ada', 'lada'])
        expect(suggestMentions('hopper', candidates).map(item => item.name)).toEqual(['grace'])
        expect(suggestMentions('AM', candidates).map(item => item.name)).toEqual(['amalthea'])
    })

    it('returns nothing when nothing matches and respects the limit', () => {
        expect(suggestMentions('zzz', candidates)).toEqual([])
        expect(suggestMentions('', candidates, 2)).toHaveLength(2)
    })
})

describe('mentionHint', () => {
    it('uses the display name when it differs from the username', () => {
        expect(mentionHint({ kind: 'USER', name: 'ada', label: 'Ada Lovelace', users: ['ada'] }))
            .toBe('Ada Lovelace')
    })

    it('falls back to the username when there is no separate display name', () => {
        expect(mentionHint({ kind: 'USER', name: 'grace', label: 'grace', users: ['grace'] }))
            .toBe('grace')
    })

    it('lists who a metamodel tag notifies', () => {
        expect(mentionHint({ kind: 'METAMODEL', name: 'amalthea', label: 'Amalthea', users: ['ada', 'grace'] }))
            .toBe('Notifies ada, grace')
        expect(mentionHint({ kind: 'METAMODEL', name: 'ascet', label: 'Ascet', users: [] }))
            .toBe('Ascet (metamodel)')
    })
})

describe('splitByMentions', () => {
    it('marks only the tags the server recognised', () => {
        expect(splitByMentions('Hi @Ada and @nobody, see @ascet.', ['ada', 'ascet'])).toEqual([
            { text: 'Hi ' },
            { text: '@Ada', mention: 'Ada' },
            { text: ' and @nobody, see ' },
            { text: '@ascet', mention: 'ascet' },
            { text: '.' },
        ])
    })

    it('returns the text unchanged without mentions', () => {
        expect(splitByMentions('plain @text', [])).toEqual([{ text: 'plain @text' }])
    })

    it('does not mark emails or longer words', () => {
        expect(splitByMentions('x@ada.com and @adam', ['ada'])).toEqual([{ text: 'x@ada.com and @adam' }])
    })

    it('escapes regex characters in usernames', () => {
        expect(splitByMentions('ping @a.b now', ['a.b'])).toEqual([
            { text: 'ping ' },
            { text: '@a.b', mention: 'a.b' },
            { text: ' now' },
        ])
        expect(splitByMentions('ping @axb now', ['a.b'])).toEqual([{ text: 'ping @axb now' }])
    })
})
