import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { TreeNode } from '../../modules/model-editor/types/tree-node.ts'
import { CustomTreeView } from './CustomTreeView.tsx'

const items: TreeNode[] = [
    {
        id: 'root',
        label: 'Root',
        children: [
            {
                id: 'package',
                label: 'Package',
                children: [{ id: 'leaf', label: 'Leaf' }],
            },
            {
                id: 'sibling',
                label: 'Sibling',
                children: [{ id: 'sibling-leaf', label: 'S-Leaf' }],
            },
        ],
    },
]

function treeItem(label: string): HTMLElement {
    const item = screen.getByText(label).closest('[role="treeitem"]')
    if (!item) throw new Error(`No tree item for ${label}`)
    return item as HTMLElement
}

function isExpanded(label: string): boolean {
    return treeItem(label).getAttribute('aria-expanded') === 'true'
}

describe('CustomTreeView', () => {
    it('starts collapsed by default', () => {
        render(<CustomTreeView items={items} />)

        expect(isExpanded('Root')).toBe(false)
        expect(screen.queryByText('Package')).toBeNull()
    })

    it('expands every node with children when defaultExpandAll is set', () => {
        render(<CustomTreeView items={items} defaultExpandAll />)

        expect(isExpanded('Root')).toBe(true)
        expect(isExpanded('Package')).toBe(true)
        expect(isExpanded('Sibling')).toBe(true)
        expect(screen.getByText('Leaf')).toBeTruthy()
    })

    it('expands newly provided items when defaultExpandAll is set', () => {
        const { rerender } = render(<CustomTreeView items={items} defaultExpandAll />)

        const nextItems: TreeNode[] = [
            { id: 'other', label: 'Other', children: [{ id: 'other-leaf', label: 'Other leaf' }] },
        ]
        rerender(<CustomTreeView items={nextItems} defaultExpandAll />)

        expect(isExpanded('Other')).toBe(true)
        expect(screen.getByText('Other leaf')).toBeTruthy()
    })

    it('expands the ancestors of an initially selected item', () => {
        render(<CustomTreeView items={items} selectedItem="leaf" />)

        expect(isExpanded('Root')).toBe(true)
        expect(isExpanded('Package')).toBe(true)
        expect(screen.getByText('Leaf')).toBeTruthy()
        expect(screen.queryByText('S-Leaf')).toBeNull()
    })

    it('keeps expanded nodes and adds the ancestors of a newly selected item', () => {
        const { rerender } = render(<CustomTreeView items={items} selectedItem="leaf" />)

        rerender(<CustomTreeView items={items} selectedItem="sibling-leaf" />)

        expect(isExpanded('Root')).toBe(true)
        expect(isExpanded('Package')).toBe(true)
        expect(isExpanded('Sibling')).toBe(true)
        expect(screen.getByText('S-Leaf')).toBeTruthy()
    })
})
