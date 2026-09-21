import { describe, expect, it } from 'vitest'
import { ecoreModelsForResourceSet, parseEncodedResourceSet } from './model-snapshot-helpers.ts'

describe('model-snapshot-helpers', () => {
    it('parses encoded resource set JSON array', () => {
        const encoded = JSON.stringify([{ uri: '/m', content: { eClass: 'http://x#//Root', _id: '/' } }])
        expect(parseEncodedResourceSet(encoded)).toHaveLength(1)
    })

    it('rejects non-array snapshots', () => {
        expect(() => parseEncodedResourceSet('{}')).toThrow(/not a resource array/)
    })

    it('matches ecore models by root eClass like the editor', () => {
        const rootType = 'http://vitruv.tools/methodologisttemplate/model#//System'
        const resourceSet = [{ uri: '/m', content: { eClass: rootType, _id: '/' } }]
        const ecoreModels = [
            { [rootType]: { id: rootType, name: 'System', attributes: {}, simpleReferences: {}, containmentReferences: {}, subTypes: [] } },
            { 'http://other#//X': { id: 'http://other#//X', name: 'X', attributes: {}, simpleReferences: {}, containmentReferences: {}, subTypes: [] } },
        ]
        const matched = ecoreModelsForResourceSet(resourceSet, ecoreModels)
        expect(matched).toHaveLength(1)
        expect(matched[0][rootType].name).toBe('System')
    })
})
