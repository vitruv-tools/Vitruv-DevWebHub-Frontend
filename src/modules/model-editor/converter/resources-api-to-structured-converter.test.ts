import { describe, expect, it } from 'vitest'
import { testHelperApiResources } from '../../../test-helper/test-model/vsum/api-resources'
import { ResourcesApiToStructuredConverter } from './resources-api-to-structured-converter'
import { testHelperStructuredEcoreModel } from '../../../test-helper/test-model/ecore-model/structured-ecore-model'
import { testHelperStructuredResources } from '../../../test-helper/test-model/vsum/structured-resources'

describe('resources-api-to-structured-converter', () => {
    it('converts', () => {
        const underTest = new ResourcesApiToStructuredConverter()

        const expected = [testHelperStructuredResources]
        const encodedExpected = JSON.stringify(expected)

        const actual = underTest.convert([testHelperApiResources], [testHelperStructuredEcoreModel])
        const encodedActual = JSON.stringify(actual)

        expect(encodedActual).toEqual(encodedExpected)
    })
})
