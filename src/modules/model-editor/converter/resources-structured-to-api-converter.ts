import type { StructuredResource } from '../types/structured-resource.ts'
import { isNil, isNotNil } from '../../../common/utils/nil-utils.ts'


/**
 * A utility class for converting structured resource objects into an API-compatible format.
 */
export class ResourcesStructuredToApiConverter {
    convert(resources: StructuredResource[]): any[] {
        return resources.map(res => ({
            uri: res.resourceSetInfo?.uri,
            content: this.convertOne(res),
        }))
    }

    private convertSome(resources: StructuredResource | StructuredResource[] | undefined): any | any[] | undefined {
        if (isNil(resources)) {
            return undefined
        }

        if (!Array.isArray(resources)) {
            return this.convertOne(resources)
        }

        return resources.map(res => this.convertOne(res))
    }

    private convertOne(resource: StructuredResource): any {

        const result: any = {}

        if (isNil(resource.resourceSetInfo)) {
            // new resource -> eClass must be defined
            result.eClass = resource.type.id
        } else {
            result._id = resource.resourceSetInfo._id

            if (isNotNil(resource.resourceSetInfo.eClass)) {
                result.eClass = resource.resourceSetInfo.eClass
            }
        }

        // attributes
        for (const attr of resource.attributes) {
            const value = attr.value
            if (isNotNil(value)) {
                result[attr.info.name] = value
            }
        }

        // simple references
        for (const sref of resource.simpleReferences) {
            const value = sref.value
            if (value == undefined) {
                continue
            }

            const getReference = (res: StructuredResource) => {
                const eClass = res.type.id
                const $ref = res.resourceSetInfo?._id
                return isNotNil($ref) ? { eClass, $ref } : undefined
            }

            if (Array.isArray(value)) {
                result[sref.info.name] = value.map(it => getReference(it))
            } else {
                result[sref.info.name] = getReference(value)
            }
        }

        // containment references
        for (const cref of resource.containmentReferences) {
            const value = this.convertSome(cref.value)
            if (value != undefined) {
                result[cref.info.name] = value
            }
        }

        return result
    }
}
