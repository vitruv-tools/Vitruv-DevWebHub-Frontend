/**
 * Keep a selected row only while it still appears in the filtered list.
 */
export function keepSelectedIfVisible<T extends { id: string }>(
    selected: T | null,
    visibleItems: readonly T[],
): T | null {
    if (!selected) {
        return null
    }
    return visibleItems.some(item => item.id === selected.id) ? selected : null
}
