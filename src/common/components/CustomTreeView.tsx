import * as React from 'react'
import { type ReactNode, useEffect, useMemo, useState } from 'react'

import { RichTreeView } from '@mui/x-tree-view/RichTreeView'
import { TreeItem, type TreeItemProps } from '@mui/x-tree-view/TreeItem'
import { useTreeItemModel } from '@mui/x-tree-view/hooks'
import { MenuItem, styled, Typography } from '@mui/material'
import Box from '@mui/material/Box'
import type { ChildrenProps } from '../types.ts'
import type { TreeNode } from '../../modules/model-editor/types/tree-node.ts'
import AddIcon from '@mui/icons-material/Add'
import { BasicMenu } from './BasicMenu.tsx'
import { isNil } from '../utils/nil-utils.ts'
import type { InputErrorSeverity } from '../../modules/model-editor/types/error.ts'
import { colorOfInputErrorSeverity } from '../../modules/model-editor/helpers/display-helpers.ts'
import { useControllableState } from '../hooks/useControllableState.ts'
import { ColumnLayout } from './flex.tsx'

type IconMap = { [key: string]: React.ReactNode }

interface CustomTreeViewProps {
    items: TreeNode[]
    icons?: IconMap
    onItemClick?: (event: React.MouseEvent, itemId: string) => void

    selectedItem?: string | null
    onSelectItem?: (itemId: string | null) => void
    highlightedItemIds?: string[]
    rootHighlightItemId?: string | null
    /** Multiple inconsistency roots (all get the strong red/orange outline). */
    rootHighlightItemIds?: string[]
    /** When true, expand all nodes that have children (Hub model overview). */
    defaultExpandAll?: boolean
    /** Fit tree to parent width (no horizontal scroll; labels wrap). */
    fitContainer?: boolean
}

/**
 * A customizable tree view component that allows item selection, expansion, and the use of icons.
 *
 * @param {Object} props The parameters needed for rendering the CustomTreeView.
 * @param {TreeNode[]} props.items The array of tree nodes representing the hierarchical structure of the tree view.
 * @param {Object} props.icons The object containing icon definitions for the tree items.
 * @param {function} props.onItemClick A callback function invoked when an item is clicked. Receives the click event and the item's ID as arguments.
 * @param {string|null} props.selectedItem The controlled selected item's ID. Allows external control over the selection state.
 * @param {function} props.onSelectItem A callback function invoked when the selected item changes. Receives the new item's ID as an argument.
 */
export function CustomTreeView({
                                   items,
                                   icons,
                                   onItemClick,
                                   selectedItem: selectedItemProp,
                                   onSelectItem,
                                   highlightedItemIds = [],
                                   rootHighlightItemId = null,
                                   rootHighlightItemIds = [],
                                   defaultExpandAll = false,
                                   fitContainer = false,
                               }: CustomTreeViewProps) {
    const [expandedItems, setExpandedItems] = useState<string[]>([])

    const [selectedItem, setSelectedItem] = useControllableState<string | null>({
        value: selectedItemProp,
        defaultValue: null,
        onChange: onSelectItem,
    })

    const parentById = useMemo(() => buildParentMap(items), [items])

    useEffect(() => {
        if (!defaultExpandAll) {
            return
        }
        setExpandedItems(collectExpandableIds(items))
    }, [items, defaultExpandAll])

    // Whenever selection changes (internal or controlled), expand all parents so it becomes visible.
    useEffect(() => {
        if (!selectedItem) return

        const ancestors = getAncestors(selectedItem, parentById)
        if (ancestors.length === 0) return

        setExpandedItems((prev) => {
            const next = new Set(prev)
            for (const a of ancestors) next.add(a)
            return Array.from(next)
        })
    }, [selectedItem, parentById])

    function collectAllItems(itemsToWalk: TreeNode[]): TreeNode[] {
        const result: TreeNode[] = []

        function walk(list: TreeNode[]) {
            for (const item of list) {
                result.push(item)
                if (item.children?.length) walk(item.children)
            }
        }

        walk(itemsToWalk)
        return result
    }

    const allItems = useMemo(() => collectAllItems(items), [items])

    function handleItemClick(event: React.MouseEvent, itemId: string) {
        const item = allItems.find((it) => it.id === itemId)

        // If the clicked item references another item, select that referenced target.
        if (item?.referencedId) {
            const refId = item.referencedId
            setSelectedItem(refId)

            // event.preventDefault()
            // setTimeout(() => setSelectedItem(refId), 10)
        } else {
            setSelectedItem(itemId)
        }

        onItemClick?.(event, itemId)
    }

    return (
        <ColumnLayout sx={{ overflow: fitContainer ? 'hidden auto' : 'auto', width: fitContainer ? '100%' : undefined }}>
            <RichTreeView
                items={items}
                onItemClick={handleItemClick}
                selectedItems={selectedItem}
                onSelectedItemsChange={(_event, itemId) => setSelectedItem(itemId)}
                expandedItems={expandedItems}
                onExpandedItemsChange={(_event, ids) => setExpandedItems(ids)}
                slots={{ item: (props) => CustomTreeItem(
                    props,
                    icons,
                    highlightedItemIds,
                    rootHighlightItemId,
                    rootHighlightItemIds,
                    fitContainer,
                ) }}
                sx={{
                    width: fitContainer ? '100%' : 'max-content',
                    minWidth: fitContainer ? 0 : '100%',
                    maxWidth: fitContainer ? '100%' : undefined,
                    '& .MuiTreeItem-content': {
                        width: '100%',
                        boxSizing: 'border-box',
                    },
                    '& .MuiTreeItem-label': {
                        overflow: fitContainer ? 'hidden' : undefined,
                        width: fitContainer ? '100%' : undefined,
                    },
                }}
            />
        </ColumnLayout>
    )
}

function CustomTreeItem(
    props: TreeItemProps,
    icons?: IconMap,
    highlightedItemIds: string[] = [],
    rootHighlightItemId: string | null = null,
    rootHighlightItemIds: string[] = [],
    fitContainer = false,
) {
    const item = useTreeItemModel<TreeNode>(props.itemId)

    if (isNil(item)) return null

    const icon = (item.type != undefined) ? icons?.[item.type] : undefined
    const inputErrorSeverity = item?.inputErrorSeverity
    const isRootHighlight = rootHighlightItemId === item.id
        || rootHighlightItemIds.includes(item.id)
    const isPathHighlight = highlightedItemIds.includes(item.id) && !isRootHighlight

    const menuItems = item.options?.map(option => (
        <MenuItem key={option.key} onClick={option.onClick} disabled={option.disabled}>{option.label}</MenuItem>
    ))

    return (
        <TreeItem
            {...props}
            slots={{
                label: () => (
                    <CustomLabel
                        inputErrorSeverity={inputErrorSeverity}
                        icon={icon}
                        menuItems={menuItems}
                        isRootHighlight={isRootHighlight}
                        isPathHighlight={isPathHighlight}
                        fitContainer={fitContainer}
                    >
                        {item.label}
                    </CustomLabel>
                ),
            }}
        />
    )
}

interface CustomLabelProps extends ChildrenProps {
    inputErrorSeverity: InputErrorSeverity | undefined
    icon?: ReactNode
    menuItems?: ReactNode[]
    isRootHighlight?: boolean
    isPathHighlight?: boolean
    fitContainer?: boolean
}

function CustomLabel({
    inputErrorSeverity,
    icon,
    children,
    menuItems,
    isRootHighlight = false,
    isPathHighlight = false,
    fitContainer = false,
    ...rest
}: CustomLabelProps) {

    return (
        <LabelWrapper
            {...rest}
            sx={{
                borderRadius: 1,
                px: 0.5,
                minWidth: 0,
                ...(isRootHighlight ? {
                    outline: '2px solid #ff6f00',
                    backgroundColor: 'rgba(255, 111, 0, 0.12)',
                } : {}),
                ...(isPathHighlight ? {
                    outline: '1px solid #ff9800',
                    backgroundColor: 'rgba(255, 152, 0, 0.08)',
                } : {}),
            }}
        >
            {icon}
            <Typography
                color={colorOfInputErrorSeverity(inputErrorSeverity)}
                component='span'
                sx={{
                    flex: 1,
                    minWidth: 0,
                    whiteSpace: fitContainer ? 'normal' : 'nowrap',
                    wordBreak: fitContainer ? 'break-word' : undefined,
                    overflowWrap: fitContainer ? 'anywhere' : undefined,
                }}
            >
                {children}
            </Typography>

            {menuItems && menuItems.length > 0 && (
                <BasicMenu
                    buttonContent={<AddIcon fontSize='small' />}
                    buttonType='icon-button'
                    items={menuItems}
                >
                </BasicMenu>
            )}

        </LabelWrapper>
    )
}

const LabelWrapper = styled(Box)`
    display: flex;
    width: 100%;
    align-items: center;
    gap: 0.75rem;

    & button {
        visibility: hidden;
    }

    &:hover button {
        visibility: visible;
    }
`


function buildParentMap(items: TreeNode[]): Map<string, string> {
    const parentById = new Map<string, string>()

    function walk(nodes: TreeNode[], parentId?: string) {
        for (const node of nodes) {
            if (parentId) parentById.set(node.id, parentId)
            if (node.children?.length) walk(node.children, node.id)
        }
    }

    walk(items)
    return parentById
}

function collectExpandableIds(items: TreeNode[]): string[] {
    const ids: string[] = []

    function walk(nodes: TreeNode[]) {
        for (const node of nodes) {
            if (node.children?.length) {
                ids.push(node.id)
                walk(node.children)
            }
        }
    }

    walk(items)
    return ids
}

function getAncestors(id: string, parentById: Map<string, string>): string[] {
    const result: string[] = []
    let current = id

    while (true) {
        const parent = parentById.get(current)
        if (!parent) break
        result.push(parent)
        current = parent
    }

    return result
}
