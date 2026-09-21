type nil = undefined | null

// const nil: nil = undefined

/**
 * Checks if the given element is null or undefined.
 *
 * @param element - The value to check, which can be of any type or nil (null or undefined).
 * @return Returns true if the element is null or undefined, otherwise false.
 */
export function isNil<T>(element: T | nil): element is nil {
    return element == undefined
}

/**
 * Checks if the given element is not null or undefined.
 *
 * @param {T | undefined | null} element - The value to be checked.
 * @return {element is T} Returns true if the element is neither null nor undefined, otherwise false.
 */
export function isNotNil<T>(element: T | undefined | null): element is T {
    return element != undefined
}

/**
 * Converts a `nil` value (null or undefined) to `undefined`. If the input is not `nil`, it returns the input unchanged.
 *
 * @param {T | null | undefined} element - The value to normalize. Can be of type `T` or `nil` (null or undefined).
 * @return {T | undefined} Returns the input value if it is not `nil`, otherwise returns `undefined`.
 */
export function normalizeNil<T>(element: T | nil): T | undefined {
    return isNil(element) ? undefined : element
}
