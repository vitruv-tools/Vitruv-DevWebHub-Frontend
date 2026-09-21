import type { TreeNode } from '../types/tree-node.ts'
import type { StructuredEcoreClass, StructuredEcoreModel, StructuredEcorePackageEntry } from '../types/structured-ecore-model.ts'
import { isNil } from '../../../common/utils/nil-utils.ts'
import { getTypeOutput } from '../helpers/display-helpers.ts'

/**
 * Converts an Ecore model into a corresponding tree structure for visual and logical representation.
 */
export class EcoreModelToTreeConverter {
    convert(ecoreModel: StructuredEcoreModel | undefined): TreeNode[] {
        if (isNil(ecoreModel)) return []
        const treeNodes: TreeNode[] = []

        Object.values(ecoreModel).forEach(ecoreClass => {
            const id = ecoreClass.id

            const superTypes = ecoreClass.directSuperTypes.map(superType => superType.name).join(',')
            const label = superTypes.length > 0 ? `${ecoreClass.name} -> ${superTypes}` : ecoreClass.name

            const children = this.convertProperties(ecoreClass)

            const newTreeNode: TreeNode = { id, label, children, type: 'class' }
            this.addToTreeNode(treeNodes, newTreeNode, ecoreClass.packageEntries)
        })

        return treeNodes
    }

    private addToTreeNode(treeNodes: TreeNode[], newTreeNode: TreeNode, packageEntries: StructuredEcorePackageEntry[]) {
        let potentialSiblings = treeNodes
        let accId = ''
        for (const entry of packageEntries) {
            accId += entry.nsUri + '/'
            let pkg = potentialSiblings.find(pkg => pkg.id === accId)
            if (isNil(pkg)) {
                pkg = { id: accId, label: entry.name, type: 'package', children: [] }
                potentialSiblings.push(pkg)
            }
            potentialSiblings = pkg.children!
        }

        potentialSiblings.push(newTreeNode)
    }

    private convertProperties(ecoreClass: StructuredEcoreClass): TreeNode[] {

        const attributes: TreeNode[] = Object.values(ecoreClass.attributes)
            .filter(attrInfo => !attrInfo.isInherited)
            .map(attrInfo => ({
                id: attrInfo.id,
                label: `${attrInfo.name} : ${getTypeOutput(attrInfo)}`,
                type: 'attribute',
            }))

        const simpleReferences: TreeNode[] = Object.values(ecoreClass.simpleReferences)
            .filter(srefInfo => !srefInfo.isInherited)
            .map(srefInfo => ({
                id: srefInfo.id,
                label: `${srefInfo.name} : ${getTypeOutput(srefInfo)}`,
                type: 'reference',
                referencedId: srefInfo.type.name,
            }))

        const containmentReferences: TreeNode[] = Object.values(ecoreClass.containmentReferences)
            .filter(crefInfo => !crefInfo.isInherited)
            .map(crefInfo => ({
                id: crefInfo.id,
                label: `${crefInfo.name} : ${getTypeOutput(crefInfo)}`,
                type: 'reference',
                referencedId: crefInfo.type.name,
            }))

        const literals: TreeNode[] =
            ecoreClass.isPrimitive
                ? []
                : ecoreClass.literals?.map(lit => ({ id: lit.id, label: lit.name, type: 'literal' })) ?? []

        return [...attributes, ...simpleReferences, ...containmentReferences, ...literals]
    }
}
