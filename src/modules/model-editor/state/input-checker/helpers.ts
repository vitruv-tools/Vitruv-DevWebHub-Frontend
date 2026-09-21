import { isNil } from '../../../../common/utils/nil-utils.ts'
import type { StructuredResource } from '../../types/structured-resource.ts'

export function requireOwnerIsNotNil(
    ownerRes: StructuredResource | undefined, ownerId: string,
): asserts ownerRes is StructuredResource {
    if (isNil(ownerRes)) {
        throw new Error(`Could not find owner ${ownerId}`)
    }
}

export function requirePropertyIsNotNil<T>(
    prop: T | undefined,
    propId: string,
    ownerId: string,
    type: 'attribute' | 'simple reference' | 'containment reference',
): asserts prop is T {
    if (isNil(prop)) {
        throw new Error(`Could not find ${type} ${propId} in owner ${ownerId}`)
    }
}