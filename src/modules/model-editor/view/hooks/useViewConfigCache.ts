import { isNotNil } from '../../../../common/utils/nil-utils.ts'

export type CachedVsum = {
    vsumId: string
    viewType: string
    selectedObjectsEClasses: string[]
}

/**
 * Provides caching functionality for view configurations using localStorage.
 * Includes methods to store, load, and clear cached view configurations.
 *
 * @return An object containing the following methods:
 * - store: Saves a CachedVsum object to localStorage.
 * - load: Retrieves and parses a CachedVsum object from localStorage, or returns undefined if none exists.
 * - clear: Removes the cached view configuration from localStorage.
 */
export function useViewConfigCache() {
    const key = 'cached-view-config'

    function store(cachedVsum: CachedVsum) {
        localStorage.setItem(key, JSON.stringify(cachedVsum))
    }

    function load(): CachedVsum | undefined {
        const encoded = localStorage.getItem(key)
        return isNotNil(encoded) ? JSON.parse(encoded) : undefined
    }

    function clear() {
        localStorage.removeItem(key)
    }

    return { store, load, clear }
}