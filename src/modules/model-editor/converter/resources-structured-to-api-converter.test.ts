import { describe, expect, it } from 'vitest'
import { ResourcesStructuredToApiConverter } from './resources-structured-to-api-converter'
import { testHelperApiResources } from '../../../test-helper/test-model/vsum/api-resources'
import { testHelperStructuredResources } from '../../../test-helper/test-model/vsum/structured-resources'


describe('resources-structured-to-api', () => {
    it('converts', () => {
        const underTest = new ResourcesStructuredToApiConverter()

        const expected = [testHelperApiResources]
        const actual = underTest.convert([testHelperStructuredResources])

        expect(actual).toEqual(expected)
    })
})
