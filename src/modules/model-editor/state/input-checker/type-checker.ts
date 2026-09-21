import { type StructuredEcoreClass } from '../../types/structured-ecore-model.ts'

export type InputErrorSeverity = 'reject' | 'warn'

export type InputError = {
    message: string
    severity: InputErrorSeverity
}

/**
 * Validates the provided value against the constraints of the specified type. If the value violates
 * the constraints of the type, a list of InputError objects is returned detailing the issues.
 *
 * @param {any} value - The value to check against the type constraints. If the value is not of
 *                      the expected type, the function returns an array of errors.
 * @param {StructuredEcoreClass} type - The type definition containing the constraints to validate against.
 * @param {number} [itemIndex] - An optional index to indicate the position of the value in a collection,
 *                               which will be prefixed to error messages if provided.
 * @return {InputError[]} An array of InputError objects describing violations of the type constraints.
 *                        Returns an empty array if no violations are found.
 */
export function checkTypeConstraints(value: any, type: StructuredEcoreClass, itemIndex?: number): InputError[] {
    const errorPrefix = itemIndex !== undefined ? `Item ${itemIndex + 1}: ` : ''
    if (value === '') {
        return []
    }

    if (typeof value !== 'string') {
        return []
    }

    switch (type.id) {
        case 'http://www.eclipse.org/emf/2002/Ecore#//EBoolean':
            return validateBoolean(value, errorPrefix)

        case 'http://www.eclipse.org/emf/2002/Ecore#//EChar':
            return validateChar(value, errorPrefix)

        case 'http://www.eclipse.org/emf/2002/Ecore#//EByte':
            return validateIntegerInRange(value, -128n, 127n, 'Byte', errorPrefix)

        case 'http://www.eclipse.org/emf/2002/Ecore#//EShort':
            return validateIntegerInRange(value, -32768n, 32767n, 'Short', errorPrefix)

        case 'http://www.eclipse.org/emf/2002/Ecore#//EInt':
            return validateIntegerInRange(value, -2147483648n, 2147483647n, 'Int', errorPrefix)

        case 'http://www.eclipse.org/emf/2002/Ecore#//ELong':
            return validateIntegerInRange(
                value,
                -9223372036854775808n,
                9223372036854775807n,
                'Long',
                errorPrefix,
            )

        case 'http://www.eclipse.org/emf/2002/Ecore#//EBigInteger':
            return validateBigInteger(value, errorPrefix)

        case 'http://www.eclipse.org/emf/2002/Ecore#//EFloat':
            return validateFloating(value, -3.4028235e38, 3.4028235e38, 'Float', errorPrefix)

        case 'http://www.eclipse.org/emf/2002/Ecore#//EDouble':
            return validateFloating(value, -Number.MAX_VALUE, Number.MAX_VALUE, 'Double', errorPrefix)

        case 'http://www.eclipse.org/emf/2002/Ecore#//EBigDecimal':
            return validateBigDecimal(value, errorPrefix)

        default:
            return []
    }
}

function validateBoolean(value: string, errorPrefix: string): InputError[] {
    if (value === 'true' || value === 'false') {
        return []
    }
    return [
        {
            message: `${errorPrefix}Expected boolean ("true" or "false"), got "${value}".`,
            severity: 'reject',
        },
    ]
}

function validateChar(value: string, errorPrefix: string): InputError[] {
    if (value.length === 1) {
        return []
    }
    return [
        {
            message: `${errorPrefix}Expected a single character, got length ${value.length}.`,
            severity: 'reject',
        },
    ]
}

function validateBigInteger(value: string, errorPrefix: string): InputError[] {
    if (/^[-+]?\d+$/.test(value)) {
        return []
    }
    return [
        {
            message: `${errorPrefix}Expected an integer number, got "${value}".`,
            severity: 'reject',
        },
    ]
}

function validateBigDecimal(value: string, errorPrefix: string): InputError[] {
    if (/^[-+]?\d+(\.\d+)?$/.test(value)) {
        return []
    }
    return [
        {
            message: `${errorPrefix}Expected a decimal number (e.g. "12" or "12.34"), got "${value}".`,
            severity: 'reject',
        },
    ]
}

function validateIntegerInRange(value: string, min: bigint, max: bigint, label: string, errorPrefix: string): InputError[] {
    if (!/^[-+]?\d+$/.test(value)) {
        return [
            {
                message: `${errorPrefix}Expected ${label} integer, got "${value}".`,
                severity: 'reject',
            },
        ]
    }

    try {
        const n = BigInt(value)
        if (n < min || n > max) {
            return [
                {
                    message: `${errorPrefix}${label} out of range [${min.toString()}, ${max.toString()}], got ${n.toString()}.`,
                    severity: 'reject',
                },
            ]
        }
        return []
    } catch {
        return [
            {
                message: `${errorPrefix}Invalid ${label} integer, got "${value}".`,
                severity: 'reject',
            },
        ]
    }
}

function validateFloating(value: string, min: number, max: number, label: string, errorPrefix: string): InputError[] {
    if (!/^[-+]?\d+(\.\d+)?([eE][-+]?\d+)?$/.test(value)) {
        return [
            {
                message: `${errorPrefix}Expected ${label} floating-point number, got "${value}".`,
                severity: 'reject',
            },
        ]
    }

    const n = Number(value)

    if (!Number.isFinite(n)) {
        return [
            {
                message: `${errorPrefix}${label} must be finite, got "${value}".`,
                severity: 'reject',
            },
        ]
    }

    if (n < min || n > max) {
        return [
            {
                message: `${errorPrefix}${label} out of range [${min}, ${max}], got ${n}.`,
                severity: 'reject',
            },
        ]
    }

    return []
}