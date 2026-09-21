import type {
    ResourceSetInfo,
    StructuredAttribute,
    StructuredContainmentReference,
    StructuredResource,
    StructuredSimpleReference,
} from '../types/structured-resource.ts'
import { normalizeAsArray } from '../../../common/utils/array-utils.ts'
import type {
    StructuredEcoreClass,
    StructuredEcoreModel,
    StructuredEcorePropertyInfo,
} from '../types/structured-ecore-model.ts'
import { isNil, isNotNil } from '../../../common/utils/nil-utils.ts'
import { match } from '../helpers/structured-resource-helpers.ts'

type StructuredResourceMap = Record<string, StructuredResource>
type SimpleReferenceKeysMap = Record<
    string,
    { value: string | string [] | undefined, info: StructuredEcorePropertyInfo }[]
>

/**
 * Class responsible for converting raw resource data from an API to a structured format
 * based on structured Ecore models.
 */
export class ResourcesApiToStructuredConverter {

    convert(resourceSet: any[], ecoreModels: StructuredEcoreModel[]): StructuredResource[] {
        const foundStructuredResources: StructuredResourceMap = {}
        const foundSimpleReferenceKeys: SimpleReferenceKeysMap = {}

        const structuredResources = resourceSet.flatMap((root, index) => {
            const resource = root.content
            const type = Object.values(ecoreModels[index]).find(ecoreClass =>
                ecoreClass.id === resource.eClass,
            )!
            return this.convertSome(
                `.${index}`,
                type,
                [resource],
                ecoreModels[index],
                foundStructuredResources,
                foundSimpleReferenceKeys,
                root.uri as string,
            )
        })
        this.setSimpleReferenceValues(foundStructuredResources, foundSimpleReferenceKeys)
        this.setParents(structuredResources, undefined)

        return match(
            structuredResources,
            nil => [],
            single => [single],
            array => array,
        )
    }

    private convertSome(
        rootId: string,
        type: StructuredEcoreClass,
        resources: any | any[],
        ecoreModel: StructuredEcoreModel,
        foundStructuredResources: StructuredResourceMap,
        foundSimpleReferenceKeys: SimpleReferenceKeysMap,
        uri?: string,
    ): StructuredResource | StructuredResource[] {

        return match<StructuredResource | StructuredResource[]>(
            resources,
            nil => {
                throw new Error(`No resources for type ${type.id}`)
            },
            single => this.convertOne(rootId, type, single, ecoreModel, foundStructuredResources, foundSimpleReferenceKeys, uri),
            array => array.map(single =>
                this.convertOne(rootId, type, single, ecoreModel, foundStructuredResources, foundSimpleReferenceKeys, uri),
            ),
        )
    }

    private convertOne(
        rootId: string,
        defaultType: StructuredEcoreClass,
        resource: any,
        ecoreModel: StructuredEcoreModel,
        foundStructuredResources: StructuredResourceMap,
        foundSimpleReferenceKeys: SimpleReferenceKeysMap,
        uri?: string,
    ): StructuredResource {
        const resourceSetInfo: ResourceSetInfo = {
            eClass: resource.eClass,
            _id: resource._id,
            uri,
        }


        const type = resource.eClass ? ecoreModel[resource.eClass] : defaultType

        const id = `${rootId}/${resource._id}`

        const {
            attributes,
            containmentReferences,
        } = this.convertProperties(rootId, id, type, resource, ecoreModel, foundStructuredResources, foundSimpleReferenceKeys)

        const structuredResource: StructuredResource = {
            id,
            type,
            attributes,
            simpleReferences: [], // set later when all structured resources are found
            containmentReferences,
            resourceSetInfo,
            propertiesWithErrors: [],
            parentId: undefined, // set later all structured resources are built
        }

        foundStructuredResources[id] = structuredResource

        return structuredResource
    }

    private convertProperties(
        rootId: string,
        structuredResourceId: string,
        type: StructuredEcoreClass,
        resource: any,
        ecoreModel: StructuredEcoreModel,
        foundStructuredResources: StructuredResourceMap,
        foundSimpleReferenceKeys: SimpleReferenceKeysMap,
    ) {

        const attributes: StructuredAttribute[] = Object.values(type.attributes).map(attrInfo => ({
            value: resource[attrInfo.name],
            info: attrInfo,
        }))

        foundSimpleReferenceKeys[structuredResourceId] = Object.values(type.simpleReferences).map(srefInfo => {

            const res = resource[srefInfo.name]

            const getValue = (res: any | any[] | undefined) => {
                if (isNil(res)) {
                    return undefined
                }

                if (!srefInfo.isArray && !Array.isArray(res)) {
                    return `${rootId}/${res.$ref}`
                }

                if (srefInfo.isArray && Array.isArray(res)) {
                    return res.map(it => `${rootId}/${it.$ref}`)
                }

                throw new Error(
                    `Error in resource ${srefInfo.id} (${srefInfo.name}: Value should be Array: ${srefInfo.isArray}; Value is Array: ${Array.isArray(res)}`,
                )
            }

            const value = getValue(res)

            return {
                value,
                info: srefInfo,
            }
        }).filter(isNotNil)

        const containmentReferences: StructuredContainmentReference[] =
            Object.values(type.containmentReferences).map(crefInfo => {
                const nextResources = resource[crefInfo.name]
                const value = isNil(nextResources)
                    ? undefined
                    : this.convertSome(
                        rootId,
                        crefInfo.type,
                        resource[crefInfo.name],
                        ecoreModel,
                        foundStructuredResources,
                        foundSimpleReferenceKeys,
                    )

                return {
                    value,
                    info: crefInfo,
                }
            })

        return { attributes, containmentReferences }
    }

    private setParents(structuredResources: StructuredResource[], parent: StructuredResource | undefined) {
        structuredResources.forEach(res => {
            res.parentId = parent?.id
            this.setParents(res.containmentReferences.flatMap(it => normalizeAsArray(it.value)).filter(isNotNil), res)
        })
    }

    private setSimpleReferenceValues(
        foundStructuredResources: StructuredResourceMap,
        foundSimpleReferenceKeys: SimpleReferenceKeysMap,
    ) {
        Object.keys(foundSimpleReferenceKeys).forEach(structuredResourceId => {

            const srefKeys = foundSimpleReferenceKeys[structuredResourceId]

            const simpleReferences: StructuredSimpleReference[] = srefKeys.map(key => {
                if (isNil(key.value)) {
                    return {
                        value: undefined,
                        info: key.info,
                    }
                }

                if (!Array.isArray(key.value)) {
                    return {
                        value: foundStructuredResources[key.value],
                        info: key.info,
                    }
                }

                return {
                    value: key.value.map(it => foundStructuredResources[it]),
                    info: key.info,
                }
            })

            foundStructuredResources[structuredResourceId].simpleReferences = simpleReferences
        })
    }
}