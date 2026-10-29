import { Button, IconButton, Menu, styled } from '@mui/material'
import * as React from 'react'
import { type ReactNode, useRef, useState, useId } from 'react'
import Box from '@mui/material/Box'

interface Props {
    items: ReactNode[]
    buttonContent: ReactNode
    buttonType: 'button' | 'icon-button'
}

/**
 * Renders a menu component that provides configurable button types and menu options.
 *
 * @param {Object} props - The props for the BasicMenu component.
 * @param {React.ReactNode} props.items - The menu items to be displayed within the menu.
 * @param {React.ReactNode} props.buttonContent - The content to display inside the button that triggers the menu.
 * @param {'icon-button' | 'button'} props.buttonType - The type of button to render as the menu trigger. Can be either 'icon-button' or 'button'.
 */
export function BasicMenu({ items, buttonContent, buttonType }: Props) {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
    const open = Boolean(anchorEl)
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation()
        setAnchorEl(event.currentTarget)
    }
    const handleClose = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation()
        setAnchorEl(null)
    }

    const buttonIdRef = useRef('button-id-' + useId())
    const menuIdRef = useRef('menu-id-' + useId())

    return (
        <MenuWrapper forceButtonVisible={open}>
            {buttonType === 'icon-button' ? (
                <IconButton
                    id={buttonIdRef}
                    aria-controls={open ? menuIdRef : undefined}
                    aria-haspopup="true"
                    aria-expanded={open ? 'true' : undefined}
                    onClick={handleClick}
                    size="small"
                >
                    {buttonContent}
                </IconButton>
            ) : (
                <Button
                    id={buttonIdRef}
                    aria-controls={open ? menuIdRef : undefined}
                    aria-haspopup="true"
                    aria-expanded={open ? 'true' : undefined}
                    onClick={handleClick}
                    size="small"
                >
                    {buttonContent}
                </Button>
            )}

            <Menu
                id={menuIdRef}
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                onClick={handleClose}
                slotProps={{
                    list: {
                        'aria-labelledby': buttonIdRef,
                    },
                }}
            >
                {items.map((item, _index) => item)}
            </Menu>
        </MenuWrapper>
    )
}

const MenuWrapper = styled(Box, { shouldForwardProp: (prop) => prop !== 'forceButtonVisible' })<{
    forceButtonVisible?: boolean
}>`
    & button {
        ${({ forceButtonVisible }) => forceButtonVisible && 'visibility: visible !important;'}
    }
`
