import { describe, expect, it } from 'vitest'
import { EcoreModelApiToStructuredConverter } from './ecore-model-api-to-structured-converter.ts'
import { testHelperApiEcoreModel } from '../../../test-helper/test-model/ecore-model/api-ecore-model.ts'
import { testHelperStructuredEcoreModel } from '../../../test-helper/test-model/ecore-model/structured-ecore-model.ts'
import { replaceByKey } from '../../../test-helper/test-utils.ts'

describe('ecore-model-api-to-structured-converter', () => {
    it('converts', () => {
        const underTest = new EcoreModelApiToStructuredConverter()

        const expected = testHelperStructuredEcoreModel
        const encodedExpected = JSON.stringify(expected)

        const actual = underTest.convert(testHelperApiEcoreModel)
        const simplifiedActual = replaceByKey([
            { subTypes: (subTypes: any[]) => subTypes.length },
            { superTypes: (superTypes: any[]) => superTypes.length },
        ], actual)
        const encodedSimplifiedActual = JSON.stringify(simplifiedActual)

        expect(encodedSimplifiedActual).toEqual(encodedExpected)
    })
})
