import type { StructuredEcorePropertyInfo } from '../../types/structured-ecore-model.ts'
import { isNil, isNotNil } from '../../../../common/utils/nil-utils.ts'
import type { InputError } from '../../types/error.ts'
import { checkTypeConstraints } from './type-checker.ts'

/**
 * Validates the provided input value against the constraints defined in the given property information.
 *
 * @template T - The type of the input value. This can be a single value or an array of values.
 * @param {StructuredEcorePropertyInfo} info - The structured property information containing constraints and metadata for validation.
 * @param {T | T[] | undefined} newValue - The input value to be validated. It can be a single value, an array of values, or undefined.
 * @return {InputError[]} - A list of validation errors represented as `InputError` objects. If no errors exist, the list will be empty.
 */
export function checkInput<T>(info: StructuredEcorePropertyInfo, newValue: T | T[] | undefined): InputError[] {
    const inputErrors: InputError[] = []

    if (info.isArray && isNotNil(newValue)) {
        if (!Array.isArray(newValue)) {
            throw new Error(`Cannot set value of array attribute ${info.id} to non-array value`)
        }

        const itemCount = newValue.length

        if (itemCount < info.minItems) {
            inputErrors.push({
                message: `${info.name} should have at least ${info.minItems} items, but has ${itemCount}.`,
                severity: 'warn',
            })
        }

        if (info.maxItems < itemCount) {
            inputErrors.push({
                message: `${info.name} should have at most ${info.maxItems} items, but has ${itemCount}.`,
                severity: 'warn',
            })
        }

        const uniqueItemCount = new Set(newValue).size
        const duplicateCount = itemCount - uniqueItemCount

        if (info.uniqueItems && duplicateCount !== 0) {
            inputErrors.push({
                message: `${info.name} should have unique items, but has ${duplicateCount} duplicates.`,
                severity: 'reject',
            })
        }

        newValue.forEach((item, index) => {
            const typeErrors = checkTypeConstraints(item, info.type, index)
            inputErrors.push(...typeErrors)
        })

    } else {
        if (Array.isArray(newValue)) {
            throw new Error(`Cannot set value of non-array attribute ${info.id} to array value`)
        }

        if (info.minItems === 1 && isNil(newValue)) {
            inputErrors.push({
                message: `${info.name} must not be null.`,
                severity: 'reject',
            })
        }

        const typeErrors = checkTypeConstraints(newValue, info.type)
        inputErrors.push(...typeErrors)

    }

    return inputErrors
}