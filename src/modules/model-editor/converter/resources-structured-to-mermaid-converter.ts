import type {
    StructuredContainmentReference,
    StructuredResource,
    StructuredSimpleReference,
} from '../types/structured-resource.ts'
import { isNil, isNotNil } from '../../../common/utils/nil-utils.ts'
import { randomString, truncate } from '../../../common/utils/string-utils.ts'
import { normalizeAsArray } from '../../../common/utils/array-utils.ts'
import { structuredResourceShortLabel } from '../helpers/display-helpers.ts'

export type MermaidHighlightOptions = {
    /** Inconsistency root — red highlight (single; also used when {@link rootResourceIds} is empty). */
    rootResourceId?: string | null
    /** Multiple inconsistency roots — all get a red ring (e.g. several unnamed entities). */
    rootResourceIds?: string[] | null
    /** User selection — vibrant blue highlight. */
    selectedResourceId?: string | null
}

/**
 * Class responsible for converting a `StructuredResource` object to a Mermaid.js class diagram definition.
 */
export class ResourcesStructuredToMermaidConverter {

    private readonly maxLength = 20

    private mermaidIds: { [actualId: string]: string } = {}

    private typeDefinitions: string[] = []
    private referenceDefinitions: string[] = []

    convert(structuredResource: StructuredResource): string {
        return this.convertAll([structuredResource])
    }

    convertAll(structuredResources: StructuredResource[]): string {
        this.mermaidIds = {}
        this.typeDefinitions = []
        this.referenceDefinitions = []

        for (const resource of structuredResources) {
            this.fillDefinitions(resource)
        }

        const typeString = this.typeDefinitions.join('\n\n')
        const referenceString = this.referenceDefinitions.join('\n\n')

        return 'classDiagram\n' + typeString + '\n\n' + referenceString
    }

    getResourceIdToMermaidIdMap(): Record<string, string> {
        return { ...this.mermaidIds }
    }

    private fillDefinitions(res: StructuredResource) {
        if (isNotNil(this.mermaidIds[res.id])) return

        this.addTypeDefinition(res)

        res.simpleReferences.forEach(sref => {
            this.addSimpleReferenceDefinition(res, sref)
        })

        res.containmentReferences.forEach(cref => {
            this.addContainmentReferenceDefinition(res, cref)
        })
    }

    private addTypeDefinition(res: StructuredResource) {
        const attributesDefinition = res.attributes.map(attr => {
            return `${attr.info.name} : ${attr.info.type.name} = ${this.getAttributeValueOutput(attr.value)}`
        }).join('\n')

        const typeDefinition = `class ${this.getObjectHeader(res)} {\n${attributesDefinition}\n}`

        this.typeDefinitions.push(typeDefinition)
    }

    private getObjectHeader(res: StructuredResource) {
        return `${this.getOrPutMermaidId(res.id)}["${structuredResourceShortLabel(res, this.maxLength)}"]`
    }

    private getAttributeValueOutput(value: string | string[] | undefined): string {
        if (isNil(value)) {
            return 'null'
        }

        const output = Array.isArray(value) ? `[${truncate(value.join(','), this.maxLength)}]` : truncate(value, this.maxLength)
        return `${output}`
    }

    private addSimpleReferenceDefinition(res: StructuredResource, sref: StructuredSimpleReference) {
        if (isNil(sref.value)) return

        normalizeAsArray(sref.value).forEach(dependencyRes => {
            this.fillDefinitions(dependencyRes)

            const refDefinition =
                `${this.getOrPutMermaidId(res.id)} --> ${this.getOrPutMermaidId(dependencyRes.id)} : ${sref.info.name}`
            this.referenceDefinitions.push(refDefinition)

        })
    }

    private addContainmentReferenceDefinition(res: StructuredResource, cref: StructuredContainmentReference) {
        if (isNil(cref.value)) return

        normalizeAsArray(cref.value).forEach(dependencyRes => {
            this.fillDefinitions(dependencyRes)

            const refDefinition =
                `${this.getOrPutMermaidId(res.id)} *-- ${this.getOrPutMermaidId(dependencyRes.id)} : ${cref.info.name}`
            this.referenceDefinitions.push(refDefinition)

        })
    }

    private getOrPutMermaidId(actualId: string): string {
        if (isNil(this.mermaidIds[actualId])) {
            const sanitized = actualId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 24)
            this.mermaidIds[actualId] = sanitized ? `n${sanitized}` : randomString(12)
        }
        return this.mermaidIds[actualId]
    }
}

