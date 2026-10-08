/**
 * An inconsistency is relevant when the user knows its source or its target.
 * No selected metamodels means "show everything". Items with no known packages stay visible.
 */
export function isRelevantToUser(
    involvedMetamodels: string[] | null | undefined,
    knownMetamodels: string[],
): boolean {
    if (knownMetamodels.length === 0) {
        return true
    }
    if (!involvedMetamodels || involvedMetamodels.length === 0) {
        return true
    }
    const known = new Set(knownMetamodels.map(name => name.toLowerCase()))
    return involvedMetamodels.some(name => known.has(name.toLowerCase()))
}
