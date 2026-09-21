export type StructuredEcoreModel = {
    [key: string]: StructuredEcoreClass
};

export type StructuredEcoreClass = {
    id: string
    name: string
    fullName?: string
    qualifiedName?: string
    packageEntries: StructuredEcorePackageEntry[]
    // type: ('object' | 'null' | 'array')[]
    subTypes: StructuredEcoreClass[]
    superTypes: StructuredEcoreClass[]
    directSuperTypes: StructuredEcoreClass[]
    attributes: StructuredEcoreProperties
    simpleReferences: StructuredEcoreProperties
    containmentReferences: StructuredEcoreProperties
    isPrimitive: boolean
    canInstantiate: boolean
    literals: StructuredLiteral[] | undefined // possible values for instances of this class. Especially used for enums and booleans
}

export type StructuredEcorePackageEntry = {
    name: string
    nsUri: string
}

export type StructuredEcoreProperties = {
    [key: string]: StructuredEcorePropertyInfo
}

export type StructuredEcorePropertyInfo = {
    id: string
    name: string
    type: StructuredEcoreClass
    isArray: boolean
    minItems: number
    maxItems: number
    uniqueItems: boolean
    isNotEditable?: boolean
    isInherited: boolean
}

export type StructuredLiteral = {
    id: string
    name: string
    value: string
}

export const ecorePrimitives: Record<string, StructuredEcoreClass> = {
    'http://www.eclipse.org/emf/2002/Ecore#//EString': createPrimitive('http://www.eclipse.org/emf/2002/Ecore#//EString', 'EString'),
    'http://www.eclipse.org/emf/2002/Ecore#//EBoolean': createPrimitive('http://www.eclipse.org/emf/2002/Ecore#//EBoolean', 'EBoolean', ['true', 'false']),
    'http://www.eclipse.org/emf/2002/Ecore#//EChar': createPrimitive('http://www.eclipse.org/emf/2002/Ecore#//EChar', 'EChar'),
    'http://www.eclipse.org/emf/2002/Ecore#//EByte': createPrimitive('http://www.eclipse.org/emf/2002/Ecore#//EByte', 'EByte'),
    'http://www.eclipse.org/emf/2002/Ecore#//EShort': createPrimitive('http://www.eclipse.org/emf/2002/Ecore#//EShort', 'EShort'),
    'http://www.eclipse.org/emf/2002/Ecore#//EInt': createPrimitive('http://www.eclipse.org/emf/2002/Ecore#//EInt', 'EInt'),
    'http://www.eclipse.org/emf/2002/Ecore#//ELong': createPrimitive('http://www.eclipse.org/emf/2002/Ecore#//ELong', 'ELong'),
    'http://www.eclipse.org/emf/2002/Ecore#//EBigInteger': createPrimitive('http://www.eclipse.org/emf/2002/Ecore#//EBigInteger', 'EBigInteger'),
    'http://www.eclipse.org/emf/2002/Ecore#//EFloat': createPrimitive('http://www.eclipse.org/emf/2002/Ecore#//EFloat', 'EFloat'),
    'http://www.eclipse.org/emf/2002/Ecore#//EDouble': createPrimitive('http://www.eclipse.org/emf/2002/Ecore#//EDouble', 'EDouble'),
    'http://www.eclipse.org/emf/2002/Ecore#//EBigDecimal': createPrimitive('http://www.eclipse.org/emf/2002/Ecore#//EBigDecimal', 'EBigDecimal'),
}


function createPrimitive(id: string, name: string, literalNames?: string[]): StructuredEcoreClass {
    const primitive: StructuredEcoreClass = {
        id,
        name,
        packageEntries: [],
        subTypes: [],
        superTypes: [],
        directSuperTypes: [],
        isPrimitive: true,
        attributes: {},
        simpleReferences: {},
        containmentReferences: {},
        canInstantiate: true,
        literals: literalNames?.map(it => ({
            id: createLiteralId(id, it),
            name: it,
            value: it,
        })),
    }

    primitive.subTypes.push(primitive)
    return primitive
}

export function createLiteralId(ecoreClassId: string, literalName: string) {
    return ecoreClassId + '::literals::' + literalName
}
