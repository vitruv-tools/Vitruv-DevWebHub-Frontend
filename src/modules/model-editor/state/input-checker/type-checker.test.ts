import { describe, expect, it } from 'vitest'
import { checkTypeConstraints, type InputError } from './type-checker'
import type { StructuredEcoreClass } from '../../types/structured-ecore-model.ts'

describe('checkTypeConstraints', () => {
    const mockEcoreClass = (id: string): StructuredEcoreClass => ({
        id,
        name: 'mockName',
        packageEntries: [],
        subTypes: [],
        superTypes: [],
        directSuperTypes: [],
        attributes: {},
        simpleReferences: {},
        containmentReferences: {},
        isPrimitive: true,
        canInstantiate: true,
        literals: undefined,
    })

    it('should return an empty array for an empty string input', () => {
        const result = checkTypeConstraints('', mockEcoreClass('http://www.eclipse.org/emf/2002/Ecore#//EBoolean'))
        expect(result).toEqual([])
    })

    it('should return an empty array for non-string inputs', () => {
        const result = checkTypeConstraints(42, mockEcoreClass('http://www.eclipse.org/emf/2002/Ecore#//EBoolean'))
        expect(result).toEqual([])
    })

    it('should validate a boolean correctly', () => {
        const result = checkTypeConstraints('true', mockEcoreClass('http://www.eclipse.org/emf/2002/Ecore#//EBoolean'))
        expect(result).toEqual([])
    })

    it('should return errors for invalid boolean input', () => {
        const result = checkTypeConstraints('notABoolean', mockEcoreClass('http://www.eclipse.org/emf/2002/Ecore#//EBoolean'))
        expect(result).toEqual([
            expect.objectContaining<InputError>({
                message: expect.any(String),
                severity: expect.any(String),
            }),
        ])
    })

    it('should validate an integer within byte range', () => {
        const result = checkTypeConstraints('127', mockEcoreClass('http://www.eclipse.org/emf/2002/Ecore#//EByte'))
        expect(result).toEqual([])
    })

    it('should return errors for integer out of byte range', () => {
        const result = checkTypeConstraints('128', mockEcoreClass('http://www.eclipse.org/emf/2002/Ecore#//EByte'))
        expect(result).toEqual([
            expect.objectContaining<InputError>({
                message: expect.any(String),
                severity: expect.any(String),
            }),
        ])
    })

    it('should validate a float within range', () => {
        const result = checkTypeConstraints('3.14', mockEcoreClass('http://www.eclipse.org/emf/2002/Ecore#//EFloat'))
        expect(result).toEqual([])
    })

    it('should return errors for float out of range', () => {
        const result = checkTypeConstraints('1e40', mockEcoreClass('http://www.eclipse.org/emf/2002/Ecore#//EFloat'))
        expect(result).toEqual([
            expect.objectContaining<InputError>({
                message: expect.any(String),
                severity: expect.any(String),
            }),
        ])
    })

    it('should return an empty array for unknown type ids', () => {
        const result = checkTypeConstraints('someValue', mockEcoreClass('unknownType'))
        expect(result).toEqual([])
    })

    it('should include itemIndex in error messages if provided', () => {
        const result = checkTypeConstraints('notABoolean', mockEcoreClass('http://www.eclipse.org/emf/2002/Ecore#//EBoolean'), 1)
        expect(result[0].message).toContain('Item 2:')
    })
})