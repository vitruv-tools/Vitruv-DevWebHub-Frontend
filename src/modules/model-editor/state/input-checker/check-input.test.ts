import { describe, expect, it, vi } from 'vitest'
import { checkInput } from './check-input'
import { checkTypeConstraints, type InputError } from './type-checker'
import type { StructuredEcorePropertyInfo } from '../../types/structured-ecore-model.ts'
import { isNil, isNotNil } from '../../../../common/utils/nil-utils.ts'

vi.mock('../../../../common/utils/nil-utils.ts', () => ({
    isNotNil: vi.fn(),
    isNil: vi.fn(),
}))

vi.mock('./type-checker', () => ({
    checkTypeConstraints: vi.fn(),
}))

describe('checkInput', () => {
    it('should return no errors for valid non-array input', () => {
        // @ts-ignore
        const info: StructuredEcorePropertyInfo = {
            id: '1',
            name: 'ValidInput',
            isArray: false,
            minItems: 1,
            maxItems: 1,
            uniqueItems: false,
            isInherited: false,
        }

        const newValue = 'testValue';
        vi.mocked(isNotNil).mockReturnValue(true);
        vi.mocked(checkTypeConstraints).mockReturnValue([])

        const result: InputError[] = checkInput(info, newValue)

        expect(result).toEqual([])
    })

    it('should return an error when non-array is null but minItems is 1', () => {
        const info: StructuredEcorePropertyInfo = {
            id: '1',
            name: 'RequiredInput',
            // @ts-ignore
            type: 'number',
            isArray: false,
            minItems: 1,
            maxItems: 1,
            uniqueItems: false,
            isInherited: false,
        }

        const newValue = undefined;
        vi.mocked(isNotNil).mockReturnValue(false);
        vi.mocked(isNil).mockReturnValue(true);
        vi.mocked(checkTypeConstraints).mockReturnValue([])

        const result: InputError[] = checkInput(info, newValue)

        expect(result).toEqual([
            { message: 'RequiredInput must not be null.', severity: 'reject' },
        ])
    })

    it('should throw an error when array input is provided to non-array field', () => {
        const info: StructuredEcorePropertyInfo = {
            id: '1',
            name: 'NonArrayField',
            // @ts-ignore
            type: 'string',
            isArray: false,
            minItems: 0,
            maxItems: 1,
            uniqueItems: false,
            isInherited: false,
        }

        const newValue = ['testArray'];
        vi.mocked(isNotNil).mockReturnValue(true)

        expect(() => checkInput(info, newValue)).toThrow(
            'Cannot set value of non-array attribute 1 to array value',
        )
    })

    it('should return a warning when arrayItem count is below minItems', () => {
        // @ts-ignore
        const info: StructuredEcorePropertyInfo = {
            id: '1',
            name: 'ArrayField',
            isArray: true,
            minItems: 2,
            maxItems: 5,
            uniqueItems: false,
            isInherited: false,
        }

        const newValue = [1];
        vi.mocked(isNotNil).mockReturnValue(true);
        vi.mocked(checkTypeConstraints).mockReturnValue([])

        const result: InputError[] = checkInput(info, newValue)

        expect(result).toEqual([
            {
                message: 'ArrayField should have at least 2 items, but has 1.',
                severity: 'warn',
            },
        ])
    })

    it('should return a warning when arrayItem count exceeds maxItems', () => {
        // @ts-ignore
        const info: StructuredEcorePropertyInfo = {
            id: '1',
            name: 'ArrayField',
            isArray: true,
            minItems: 1,
            maxItems: 3,
            uniqueItems: false,
            isInherited: false,
        }

        const newValue = [1, 2, 3, 4];
        vi.mocked(isNotNil).mockReturnValue(true);
        vi.mocked(checkTypeConstraints).mockReturnValue([])

        const result: InputError[] = checkInput(info, newValue)

        expect(result).toEqual([
            {
                message: 'ArrayField should have at most 3 items, but has 4.',
                severity: 'warn',
            },
        ])
    })

    it('should return an error when array contains duplicate values and uniqueItems is true', () => {
        // @ts-ignore
        const info: StructuredEcorePropertyInfo = {
            id: '1',
            name: 'UniqueArrayField',
            isArray: true,
            minItems: 1,
            maxItems: 5,
            uniqueItems: true,
            isInherited: false,
        }

        const newValue = [1, 2, 2, 3];
        vi.mocked(isNotNil).mockReturnValue(true);
        vi.mocked(checkTypeConstraints).mockReturnValue([])

        const result: InputError[] = checkInput(info, newValue)

        expect(result).toEqual([
            {
                message: 'UniqueArrayField should have unique items, but has 1 duplicates.',
                severity: 'reject',
            },
        ])
    })

    it('should handle type constraint errors for non-array values', () => {
        // @ts-ignore
        const info: StructuredEcorePropertyInfo = {
            id: '1',
            name: 'TypeTestField',
            isArray: false,
            minItems: 0,
            maxItems: 1,
            uniqueItems: false,
            isInherited: false,
        }

        const newValue = 'invalidType';
        vi.mocked(isNotNil).mockReturnValue(true);
        vi.mocked(checkTypeConstraints).mockReturnValue([
            { message: 'Invalid type provided.', severity: 'reject' },
        ])

        const result: InputError[] = checkInput(info, newValue)

        expect(result).toEqual([
            { message: 'Invalid type provided.', severity: 'reject' },
        ])
    })
})