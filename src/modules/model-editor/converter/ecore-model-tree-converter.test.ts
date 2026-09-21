import { describe, expect, it } from 'vitest'
import { EcoreModelApiToStructuredConverter } from './ecore-model-api-to-structured-converter.ts'
import { testHelperApiEcoreModel } from '../../../test-helper/test-model/ecore-model/api-ecore-model.ts'
import { EcoreModelToTreeConverter } from './ecore-model-tree-converter.ts'
import { testHelperEcoreModelTree } from '../../../test-helper/test-model/ecore-model/ecore-model-tree.ts'

describe('ecore-model-to-tree-converter', () => {
    it('converts', () => {
        const structuredEcoreModel = new EcoreModelApiToStructuredConverter().convert(testHelperApiEcoreModel)
        const underTest = new EcoreModelToTreeConverter()

        const expected = testHelperEcoreModelTree
        const encodedExpected = JSON.stringify(expected, null, 2)

        const actual = underTest.convert(structuredEcoreModel)
        const encodedActual = JSON.stringify(actual, null, 2)

        expect(encodedActual).toEqual(encodedExpected)
    })
})
