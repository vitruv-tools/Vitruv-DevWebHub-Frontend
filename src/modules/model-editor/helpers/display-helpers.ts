import type { StructuredAttribute, StructuredResource } from '../types/structured-resource.ts'
import { truncate } from '../../../common/utils/string-utils.ts'
import type { InputErrorSeverity } from '../types/error.ts'
import { isNil } from '../../../common/utils/nil-utils.ts'
import type { StructuredEcorePropertyInfo } from '../types/structured-ecore-model.ts'

/**
 * Constructs a structured label for a given resource by combining its type
 * name, attribute name, and attribute value, if available.
 *
 * @param {StructuredResource} resource - The resource containing attributes and type information.
 * @return {string} A string representing the structured label for the resource.
 */
export function structuredResourceLabel(resource: StructuredResource): string {
    const name = getName(resource.attributes)
    const value = getValue(resource.attributes)

    const labelPrefix = name ? `${name} : ` : ''
    const labelSuffix = value != undefined ? ` = ${value}` : ''
    const label = labelPrefix + resource.type.name + labelSuffix

    return label
}

/**
 * Generates a short label for a structured resource by combining its truncated name and type.
 *
 * @param {StructuredResource} resource - The structured resource object containing attributes and type details.
 * @param {number} [maxNameLength=Infinity] - The maximum allowed length for the resource's name before truncating.
 * @return {string} A short label, which is a combination of the resource's truncated name and its type name.
 * If the name is unavailable, only the type name is returned.
 */
export function structuredResourceShortLabel(resource: StructuredResource, maxNameLength: number = Infinity): string {
    const name = getName(resource.attributes)
    return name ? `${truncate(name, maxNameLength)} : ${resource.type.name}` : resource.type.name
}

/**
 * Determines the corresponding color for a given input error severity.
 *
 * @param {InputErrorSeverity | undefined} severity - The severity level of the input error, or undefined if none.
 * @return {'error' | 'warn' | undefined} The color associated with the specified severity, or undefined if no mapping exists.
 */
export function colorOfInputErrorSeverity(severity: InputErrorSeverity | undefined): 'error' | 'warn' | undefined {
    if (isNil(severity)) return undefined

    const colorMap = {
        reject: 'error',
        warn: 'warn',
    } as const

    return colorMap[severity]
}

/**
 * Constructs a string representation of the type and its constraints based on the provided information.
 * Handles array indicators, minimum and maximum values.
 *
 * @param {StructuredEcorePropertyInfo} info - Object containing type and property details such as type name, array status, and item constraints.
 * @return {string} A formatted string representing the type and its constraints.
 */
export function getTypeOutput(info: StructuredEcorePropertyInfo): string {
    const minOutput = info.minItems === 0 ? '' : info.minItems
    const maxOutput = info.maxItems === Infinity ? '' : info.maxItems
    const separator = minOutput === '' && maxOutput === '' ? '' : ';'

    const arrayOutput = info.isArray ? `[${minOutput}${separator}${maxOutput}]` : ''

    return `${info.type.name}${arrayOutput}`
}

function getName(attributes: StructuredAttribute[]): string | undefined {
    const nameKeys = ['name', 'title', 'label', 'header', 'heading', 'caption']
    for (const key of nameKeys) {
        const name = attributes.find(attr => attr.info.name === key)?.value
        if (name != undefined && typeof name == 'string') return name
    }

    return undefined
}

function getValue(attributes: StructuredAttribute[]): string | number | boolean | undefined {
    const valueKeys = ['value']
    for (const key of valueKeys) {
        const value = attributes.find(attr => attr.info.name === key)?.value
        if (value != undefined && typeof value != 'object') return value
    }

    return undefined
}
