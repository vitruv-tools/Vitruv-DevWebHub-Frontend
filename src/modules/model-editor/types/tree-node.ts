export type TreeNode = {
    id: string
    label: string
    children?: TreeNode[]
    type?: 'attribute' | 'reference' | 'literal' | 'class' | 'package'
    referencedId?: string | undefined
    options?: TreeNodeOption[]
    inputErrorSeverity?: 'reject' | 'warn'
}

export type TreeNodeOption = {
    key: string
    label: string
    onClick?: () => void
    disabled?: boolean
}