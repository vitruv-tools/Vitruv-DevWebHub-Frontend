import type { MentionKind } from '../types/open-inconsistency.ts'

export type MentionSuggestion = {
    kind: MentionKind
    /** Inserted after the @. */
    name: string
    label: string
}

/** The `@query` being typed at the caret. `start` is the index of the @. */
export type ActiveMention = {
    start: number
    query: string
}

export type BodySegment = {
    text: string
    /** Set when this part of the text is a tag the server recognised. */
    mention?: string
}

export type MentionHint = {
    kind: MentionKind
    name: string
    label: string
    users: string[]
}

/**
 * Extra text shown next to a tag: a user's display name, or who a
 * metamodel tag notifies. Always a non-empty string so the UI never
 * depends on hover alone.
 */
export function mentionHint(mention: MentionHint): string {
    if (mention.kind === 'METAMODEL') {
        if (mention.users.length > 0) {
            return `Notifies ${mention.users.join(', ')}`
        }
        return `${mention.label} (metamodel)`
    }
    if (mention.label && mention.label.toLowerCase() !== mention.name.toLowerCase()) {
        return mention.label
    }
    return mention.name
}

const WORD_CHAR = /[\p{L}\p{N}_]/u

function isWordChar(char: string | undefined): boolean {
    return char !== undefined && char !== '' && WORD_CHAR.test(char)
}

/**
 * Finds the `@query` the caret is in, or null. The @ must start a word, so
 * an email address like `a@b` doesn't open the list.
 */
export function findActiveMention(text: string, caret: number): ActiveMention | null {
    caret = Math.min(caret, text.length)
    let index = caret - 1
    while (index >= 0) {
        const char = text[index]
        if (char === '@') {
            const before = text[index - 1]
            if (before !== undefined && (isWordChar(before) || before === '@')) {
                return null
            }
            return { start: index, query: text.slice(index + 1, caret) }
        }
        if (/\s/.test(char)) {
            return null
        }
        index -= 1
    }
    return null
}

/**
 * Replaces the `@query` with `@name` and a space (unless a space follows already).
 * Returns the new text and the caret position after the inserted tag.
 */
export function applySuggestion(
    text: string,
    active: ActiveMention,
    caret: number,
    name: string,
): { text: string, caret: number } {
    const rest = text.slice(caret)
    const needsSpace = rest === '' || !/^\s/.test(rest)
    const inserted = needsSpace ? `@${name} ` : `@${name}`
    const next = text.slice(0, active.start) + inserted + rest
    return { text: next, caret: active.start + inserted.length + (needsSpace ? 0 : 1) }
}

/**
 * Users and metamodels matching the query, best first: names that start with
 * the query, then names that contain it. Matches username, display name and
 * metamodel label. An empty query lists everything.
 */
export function suggestMentions(
    query: string,
    candidates: MentionSuggestion[],
    limit = 8,
): MentionSuggestion[] {
    const needle = query.trim().toLowerCase()
    const scored: { suggestion: MentionSuggestion, rank: number, order: number }[] = []
    candidates.forEach((suggestion, order) => {
        const name = suggestion.name.toLowerCase()
        const label = suggestion.label.toLowerCase()
        let rank: number | null = null
        if (needle === '') {
            rank = 0
        } else if (name.startsWith(needle)) {
            rank = 0
        } else if (label.startsWith(needle) || label.split(/\s+/).some(part => part.startsWith(needle))) {
            rank = 1
        } else if (name.includes(needle) || label.includes(needle)) {
            rank = 2
        }
        if (rank !== null) {
            scored.push({ suggestion, rank, order })
        }
    })
    scored.sort((a, b) => a.rank - b.rank || a.order - b.order)
    return scored.slice(0, limit).map(entry => entry.suggestion)
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Splits a comment into plain parts and tags so tags can be highlighted.
 * `names` come from the server's mentions, so only real tags are marked.
 */
export function splitByMentions(body: string, names: string[]): BodySegment[] {
    const unique = [...new Set(names.filter(name => name.trim() !== ''))]
    if (unique.length === 0 || !body.includes('@')) {
        return [{ text: body }]
    }
    unique.sort((a, b) => b.length - a.length)
    const pattern = new RegExp(
        `(?<![\\p{L}\\p{N}_@])@(${unique.map(escapeRegExp).join('|')})(?![\\p{L}\\p{N}_])`,
        'giu',
    )
    const segments: BodySegment[] = []
    let last = 0
    for (const match of body.matchAll(pattern)) {
        const start = match.index ?? 0
        if (start > last) {
            segments.push({ text: body.slice(last, start) })
        }
        segments.push({ text: match[0], mention: match[1] })
        last = start + match[0].length
    }
    if (last < body.length) {
        segments.push({ text: body.slice(last) })
    }
    return segments
}
