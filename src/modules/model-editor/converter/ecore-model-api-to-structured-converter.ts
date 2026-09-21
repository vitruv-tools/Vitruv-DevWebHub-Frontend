import type {
    ApiEcoreModelClassifier,
    ApiEcoreModelFeature,
    ApiEcoreModelPackage,
} from '../types/api-ecore-model.ts'
import {
    createLiteralId,
    type StructuredEcoreClass,
    type StructuredEcoreModel,
    type StructuredEcorePackageEntry,
    ecorePrimitives,
    type StructuredEcoreProperties,
    type StructuredEcorePropertyInfo,
} from '../types/structured-ecore-model.ts'
import { isNil, isNotNil } from '../../../common/utils/nil-utils.ts'
import { normalizeAsArray } from '../../../common/utils/array-utils.ts'
import { stringAsBoolean } from '../../../common/utils/string-utils.ts'

/**
 * A class for converting Ecore models from an API representation
 * (`ApiEcoreModelPackage` and related types) into a structured format
 * (`StructuredEcoreModel`) that organizes classes, their properties,
 * and relationships in a more manageable structure.
 */
export class EcoreModelApiToStructuredConverter {
    convert(rootPackage: ApiEcoreModelPackage): StructuredEcoreModel {
        const ecoreModel: StructuredEcoreModel = {}
        const allApiEcoreModelClassifiers: Record<string, ApiEcoreModelClassifier> = {}

        this.collectAllClasses(rootPackage, [], ecoreModel, allApiEcoreModelClassifiers)

        Object.keys(allApiEcoreModelClassifiers).forEach(classifierId => {
            const classifier = allApiEcoreModelClassifiers[classifierId]


            const superTypes: StructuredEcoreClass[] = []
            const directSuperTypes: StructuredEcoreClass[] = []
            this.collectAllSuperClasses(classifier, rootPackage, ecoreModel, allApiEcoreModelClassifiers, superTypes, directSuperTypes)

            const ecoreClass = ecoreModel[classifierId]
            ecoreClass.superTypes = superTypes
            ecoreClass.directSuperTypes = directSuperTypes

            ecoreClass.subTypes.push(ecoreClass)

            superTypes.forEach(superType => {
                const found = superType.subTypes.find(it => it.id === ecoreClass.id)
                if (isNil(found)) {
                    superType.subTypes.push(ecoreClass)
                }
            })

            const attributes: StructuredEcoreProperties = {}
            const simpleReferences: StructuredEcoreProperties = {}
            const containmentReferences: StructuredEcoreProperties = {}
            const foundNames = new Set<string>()


            const features = normalizeAsArray(classifier.eStructuralFeatures)
            const superTypeFeatures = superTypes.map(superType => {
                const classifier = allApiEcoreModelClassifiers[superType.id]
                return normalizeAsArray(classifier.eStructuralFeatures)
            })

            this.collectProperties(
                features,
                classifierId,
                rootPackage,
                ecoreModel,
                false,
                attributes,
                simpleReferences,
                containmentReferences,
                foundNames,
            )

            this.collectProperties(
                superTypeFeatures.flat(),
                classifierId,
                rootPackage,
                ecoreModel,
                true,
                attributes,
                simpleReferences,
                containmentReferences,
                foundNames,
            )

            ecoreClass.attributes = attributes
            ecoreClass.simpleReferences = simpleReferences
            ecoreClass.containmentReferences = containmentReferences
        })

        return ecoreModel
    }

    private collectAllClasses(
        pkg: ApiEcoreModelPackage,
        parentPackageEntries: StructuredEcorePackageEntry[],
        ecoreModel: StructuredEcoreModel,
        allApiEcoreModelClassifiers: Record<string, ApiEcoreModelClassifier>,
    ) {
        const packageEntry: StructuredEcorePackageEntry = {
            nsUri: pkg.nsURI,
            name: pkg.name,
        }

        const packageEntries = [...parentPackageEntries, packageEntry]

        pkg.eClassifiers = normalizeAsArray(pkg.eClassifiers)
        pkg.eSubpackages = normalizeAsArray(pkg.eSubpackages)

        pkg.eClassifiers.forEach(c => {
            const id = this.getClassId(packageEntries, c.name)

            const ecoreClass: StructuredEcoreClass = {
                id,
                name: c.name,
                fullName: `${pkg.name}.${c.name}`,
                qualifiedName: id,
                packageEntries,
                superTypes: [],
                directSuperTypes: [],
                subTypes: [],
                isPrimitive: false,
                attributes: {},
                simpleReferences: {},
                containmentReferences: {},
                canInstantiate: !stringAsBoolean(c.abstract, false) && !stringAsBoolean(c.interface, false),
                literals: c.eLiterals?.map(it => ({
                    id: createLiteralId(id, it.name),
                    name: it.name,
                    value: it.value,
                })),
            }

            ecoreModel[id] = ecoreClass
            allApiEcoreModelClassifiers[id] = c
        })


        pkg.eSubpackages.forEach(subpkg => {
            this.collectAllClasses(subpkg, packageEntries, ecoreModel, allApiEcoreModelClassifiers)
        })
    }

    private collectAllSuperClasses(
        classifier: ApiEcoreModelClassifier,
        rootPackage: ApiEcoreModelPackage,
        ecoreModel: StructuredEcoreModel,
        allApiEcoreModelClassifiers: Record<string, ApiEcoreModelClassifier>,
        superTypes: StructuredEcoreClass[],
        directSuperTypes: StructuredEcoreClass[] | undefined,
    ) {
        classifier.eSuperTypes?.split(' ').forEach(superTypeSubpackagedName => {
            const superTypeId = rootPackage.nsURI + superTypeSubpackagedName
            superTypes.push(ecoreModel[superTypeId])

            if (isNotNil(directSuperTypes)) {
                directSuperTypes.push(ecoreModel[superTypeId])
            }

            const superClassifier = allApiEcoreModelClassifiers[superTypeId]
            this.collectAllSuperClasses(superClassifier, rootPackage, ecoreModel, allApiEcoreModelClassifiers, superTypes, undefined)
        })
    }

    private collectProperties(
        features: ApiEcoreModelFeature[],
        classifierId: string,
        rootPackage: ApiEcoreModelPackage,
        ecoreModel: StructuredEcoreModel,
        isInherited: boolean,
        attributes: StructuredEcoreProperties,
        simpleReferences: StructuredEcoreProperties,
        containmentReferences: StructuredEcoreProperties,
        foundNames: Set<string>,
    ) {
        for (const feature of features) {
            if (foundNames.has(feature.name)) {
                continue
            }

            const propId = classifierId + '::' + feature.name
            const typeId = this.getFeaturesTypeId(feature.eType, rootPackage)
            const type = ecoreModel[typeId] ? ecoreModel[typeId] : ecorePrimitives[typeId]
            const minItems = this.getMinItems(feature.lowerBound)
            const maxItems = this.getMaxItems(feature.upperBound)
            const isNotEditable = this.getIsNotEditable(
                stringAsBoolean(feature.changeable, true),
                stringAsBoolean(feature.derived),
                stringAsBoolean(feature.unsettable),
            )
            const uniqueItems = stringAsBoolean(feature.unique, true)
            const isArray = maxItems > 1

            const info: StructuredEcorePropertyInfo = {
                id: propId,
                name: feature.name,
                type,
                minItems,
                maxItems,
                isArray,
                uniqueItems,
                isNotEditable,
                isInherited,
            }

            if (feature.type === 'ecore:EAttribute') {
                attributes[propId] = info
            } else if (feature.type === 'ecore:EReference') {
                if (stringAsBoolean(feature.containment)) {
                    containmentReferences[propId] = info
                } else {
                    simpleReferences[propId] = info
                }
            } else {
                throw new Error(`Unknown feature type: ${feature.type}`)
            }
        }
    }

    private getFeaturesTypeId(eType: string, pkg: ApiEcoreModelPackage): string {
        if (eType.startsWith('ecore:EDataType ')) {
            return eType.substring('ecore:EDataType '.length)
        } else if (eType.startsWith('#//')) {
            return pkg.nsURI + eType
        }

        throw new Error(`Unknown type: ${eType}`)
    }

    private getMinItems(lowerBound: string | undefined): number {
        if (isNil(lowerBound)) {
            return 0
        }
        const lowerBoundNumber = +lowerBound

        return lowerBoundNumber < 0 ? 0 : lowerBoundNumber
    }

    private getMaxItems(upperBound: string | undefined): number {
        if (isNil(upperBound)) {
            return 1
        }
        const upperBoundNumber = +upperBound
        return upperBoundNumber < 0 ? Infinity : upperBoundNumber
    }

    private getClassId([rootEntry, ...otherEntries]: StructuredEcorePackageEntry[], className: string): string {
        if (isNil(rootEntry)) {
            throw new Error('no root package defined')
        }

        let id = `${rootEntry.nsUri}#//`

        otherEntries.forEach(entry => {
            id += `${entry.name}/`
        })

        id += className

        return id
    }

    private getIsNotEditable(
        changeable: boolean | undefined, derived: boolean | undefined, unsettable: boolean | undefined,
    ): boolean {

        const notChangeable = isNil(changeable) ? false : !changeable

        if (isNil(derived)) {
            derived = false
        }

        if (isNil(unsettable)) {
            unsettable = false
        }

        return notChangeable || derived || unsettable
    }
}