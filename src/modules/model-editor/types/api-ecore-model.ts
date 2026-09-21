export interface ApiEcoreModelPackage {
    name: string
    nsURI: string
    nsPrefix: string
    eClassifiers: ApiEcoreModelClassifier[] | undefined
    eSubpackages: ApiEcoreModelPackage[] | undefined
}

export interface ApiEcoreModelClassifier {
    name: string
    eSuperTypes: string
    eStructuralFeatures: ApiEcoreModelFeature[]
    abstract?: string
    interface?: string
    eLiterals?: { name: string, value: string }[]
}

export interface ApiEcoreModelFeature {
    type: 'ecore:EAttribute' | 'ecore:EReference'
    name: string
    eType: string
    lowerBound?: string
    upperBound?: string
    containment?: string
    changeable?: string
    unsettable?: string
    derived?: string
    unique?: string
}
