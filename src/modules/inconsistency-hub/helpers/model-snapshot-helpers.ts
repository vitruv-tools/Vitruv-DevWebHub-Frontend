import type { StructuredEcoreModel } from '../../model-editor/types/structured-ecore-model.ts'
import { isNil, isNotNil } from '../../../common/utils/nil-utils.ts'

/** Parse resource set JSON from open-view / model-snapshot API (always a JSON array). */
export function parseEncodedResourceSet(encodedResourceSet: string): unknown[] {
    const parsed: unknown = JSON.parse(encodedResourceSet)
    if (Array.isArray(parsed)) {
        return parsed
    }
    throw new Error('Model snapshot is not a resource array')
}

/** Same ecore-model matching as the editor when opening a view. */
export function ecoreModelsForResourceSet(
    resourceSet: unknown[],
    ecoreModels: StructuredEcoreModel[],
): StructuredEcoreModel[] {
    return resourceSet.map(res => {
        const rootType = (res as { content?: { eClass?: string } }).content?.eClass
        if (!rootType) {
            throw new Error('Resource set entry is missing content.eClass')
        }
        const foundEcoreModel = ecoreModels.find(ecoreModel => isNotNil(ecoreModel[rootType]))
        if (isNil(foundEcoreModel)) {
            throw new Error(`Could not find ecore model for root type ${rootType}`)
        }
        return foundEcoreModel
    })
}
