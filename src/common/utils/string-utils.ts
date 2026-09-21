import { isNil } from './nil-utils.ts'

/**
 * Generates a random alphanumeric string of the specified length.
 *
 * @param {number} length - The desired length of the generated string.
 * @return {string} A randomly generated string containing uppercase letters, lowercase letters, and digits.
 */
export function randomString(length: number): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const result: string[] = new Array(length)

    const randomValues = new Uint32Array(length)
    crypto.getRandomValues(randomValues)

    for (let i = 0; i < length; i++) {
        const index = randomValues[i] % charset.length
        result[i] = charset[index]
    }

    return result.join('')
}

/**
 * Truncates a given string to the specified maximum length, preserving grapheme clusters.
 *
 * @param {string} text - The input string to be truncated.
 * @param {number} maxLength - The maximum number of graphemes allowed in the truncated string.
 * @return {string} The truncated string with a trailing ellipsis if it exceeds the maximum length.
 */
export function truncate(text: string, maxLength: number): string {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    const graphemes = Array.from(segmenter.segment(text), s => s.segment)

    if (graphemes.length <= maxLength) {
        return text
    }

    return graphemes.slice(0, maxLength).join('') + '…'
}

/**
 * Converts a string to a boolean value. Returns the default value if the input is undefined or null.
 *
 * @param {string | undefined} value - The input string to be converted to a boolean. Accepts 'true' as true; all other non-undefined strings are treated as false.
 * @param {boolean} [defaultValue=false] - The default boolean value to return if the input is undefined or null.
 * @return {boolean} The boolean representation of the input string or the default value if the input is undefined or null.
 */
export function stringAsBoolean(value: string | boolean | undefined, defaultValue: boolean = false): boolean {
    if (isNil(value)) return defaultValue
    if (typeof value === 'boolean') return value
    return value === 'true'
}


/**
 * Enumerates all prefixes of the input string up to each occurrence of the specified delimiter,
 * including the entire input string as the final entry.
 *
 * @param {string} input - The string to process and extract prefixes from.
 * @param {string} delimiter - The delimiter used as the boundary to define prefixes.
 * @return {string[]} An array of prefixes, ending with the complete input string.
 */
export function enumeratePrefixes(input: string, delimiter: string): string[] {
    const result: string[] = []
    let searchFrom = 0

    while (true) {
        const idx = input.indexOf(delimiter, searchFrom)
        if (idx === -1) break
        result.push(input.slice(0, idx))
        searchFrom = idx + 1
    }

    result.push(input)
    return result
}