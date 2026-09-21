import { Modal, Paper, styled } from '@mui/material'
import type { ChildrenProps } from '../types.ts'

interface Props {
    open: boolean
    onClose?: () => void
    /** Pixels reserved at the top (e.g. editor toolbar) so the modal does not cover it. */
    topInset?: number
}

/**
 * A base component for rendering a fullscreen modal.
 *
 * @param {Object} props - The component's props.
 * @param {boolean} props.open - Determines whether the modal is open or closed.
 * @param {function} props.onClose - Callback function triggered when the modal is requested to be closed.
 * @param {ReactNode} props.children - The content to be displayed inside the modal.
 * @param {number} props.topInset - Optional top offset so a toolbar above stays clickable.
 */
export function BaseFullscreenModal({ open, onClose, children, topInset = 0 }: Props & ChildrenProps) {
    return (
        <Modal
            open={open}
            onClose={onClose}
            sx={{
                top: topInset,
                height: topInset > 0 ? `calc(100% - ${topInset}px)` : '100%',
            }}
            slotProps={{
                backdrop: {
                    sx: topInset > 0 ? { top: topInset } : undefined,
                },
            }}
        >
            <ModalContent>
                {children}
            </ModalContent>
        </Modal>
    )
}

const ModalContent = styled(Paper)`
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 80%;
    height: 80%;
    outline: none;
`
