import type { StructuredResource } from '../types/structured-resource.ts'
import { isNil, isNotNil } from '../../../common/utils/nil-utils.ts'
import { normalizeAsArray } from '../../../common/utils/array-utils.ts'

/**
 * Searches for a structured resource by its unique identifier within a given resource or list of resources.
 *
 * @param {StructuredResource | StructuredResource[] | undefined} structuredResources - The resource or list of resources to search within. It can be undefined.
 * @param {string} id - The unique identifier of the resource to find.
 * @return {StructuredResource | undefined} The resource that matches the given identifier, or undefined if not found.
 */
export function findStructuredResourceById(
    structuredResources: StructuredResource | StructuredResource[] | undefined,
    id: string,
): StructuredResource | undefined {

    if (isNil(structuredResources)) {
        return undefined
    }

    for (const res of normalizeAsArray(structuredResources)) {

        if (res.id === id) return res

        for (const cref of res.containmentReferences) {
            const deepRes = findStructuredResourceById(cref.value, id)
            if (isNotNil(deepRes)) return deepRes
        }
    }

    return undefined
}

/**
 * Retrieves all structured resources by traversing the given structured resources array,
 * including nested containment references.
 *
 * @param {StructuredResource[] | undefined} structuredResources - The array of structured resources or undefined.
 * @return {StructuredResource[]} An array of all structured resources, including nested resources found
 * in containment references.
 */
export function getAllStructuredResources(structuredResources: StructuredResource[] | undefined): StructuredResource[] {
    function walk(res: StructuredResource | StructuredResource[] | undefined): StructuredResource[] {
        if (isNil(res)) return []
        if (Array.isArray(res)) return res.flatMap(walk)

        const children = res.containmentReferences.flatMap((ref) => walk(ref.value))
        return [res, ...children]
    }

    return walk(structuredResources)
}

/**
 * Aggregates structured resources into a record where the keys are type IDs,
 * and the values are arrays of structured resources associated with those types.
 *
 * @param {StructuredResource[] | undefined} structuredResources - An array of structured resources or undefined.
 * When undefined, the function will return an empty record.
 * @return {Record<string, StructuredResource[]>} A record mapping type IDs to arrays of structured resources
 * that belong to those types. It includes all structured resources and their containment references recursively.
 */
export function getTypesToStructuresResources(
    structuredResources: StructuredResource[] | undefined,
): Record<string, StructuredResource[]> {

    function collect(
        structuredResources: StructuredResource[],
        acc: Record<string, StructuredResource[]> = {},
    ): Record<string, StructuredResource[]> {

        for (const res of structuredResources) {
            const typeId = res.type.id
            if (isNil(acc[typeId])) {
                acc[typeId] = []
            }
            acc[typeId].push(res)

            for (const cref of res.containmentReferences) {
                const children = normalizeAsArray(cref.value ?? [])
                collect(children, acc)
            }
        }

        return acc
    }

    return isNil(structuredResources) ? {} : collect(structuredResources)
}

/**
 * Executes different functions based on the type and value of the provided argument.
 *
 * @template R - The type of the return value.
 * @param {any | any[] | undefined} value - The value to evaluate. Can be `undefined`, a single value, or an array.
 * @param {(nil: undefined) => R} ifNil - The callback to execute if the value is `undefined`.
 * @param {(single: any) => R} ifSingle - The callback to execute if the value is a single non-array value.
 * @param {(array: any[]) => R} ifArray - The callback to execute if the value is an array.
 * @param {boolean} [shallBeArray] - An optional flag indicating whether the value is required to be an array. Throws an error if the value does not match the specification.
 * @return {R} The result of the executed callback, based on the evaluation of the provided value.
 */
export function match<R>(
    value: any | any[] | undefined,
    ifNil: (nil: undefined) => R,
    ifSingle: (single: any) => R,
    ifArray: (array: any[]) => R,
    shallBeArray?: boolean,
): R {
    if (value === undefined) {
        if (typeof value !== 'undefined') {
            throw new Error(`typeof ${value} should be undefined, but is ${typeof value}.`)
        }
        return ifNil(value)
    }

    if (Array.isArray(value)) {
        if (isNotNil(shallBeArray) && !shallBeArray) {
            throw new Error(`${value} is an array, but shall not be an array.`)
        }

        return ifArray(value)
    }

    if (isNotNil(shallBeArray) && shallBeArray) {
        throw new Error(`${value} is not an array, but shall be an array.`)
    }

    return ifSingle(value)
}
