import { isNil } from './nil-utils.ts'

/**
 * Normalizes the input into an array. If the input is already an array, it is returned as is.
 * If the input is a single value, it is wrapped in an array. Returns an empty array if the input is undefined or null.
 *
 * @template T
 * @param {T | T[] | undefined} value - The value to normalize, which can be a single item, an array, or undefined.
 * @return {T[]} An array representation of the input value. Returns an empty array if the input is undefined or null.
 */
export function normalizeAsArray<T>(value: T | T[] | undefined): T[] {
    if (isNil(value)) return []
    return Array.isArray(value) ? value : [value]
}
