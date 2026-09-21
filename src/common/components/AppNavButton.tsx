import { Button, type ButtonProps } from '@mui/material'

type Props = Omit<ButtonProps, 'variant' | 'size'> & {
    label: string
}

/** Shared top-bar switch control (Inconsistency Hub / Editor) — outlined, compact, consistent. */
export function AppNavButton({ label, sx, ...rest }: Props) {
    return (
        <Button
            size='small'
            variant='outlined'
            sx={{
                minWidth: 64,
                fontWeight: 600,
                letterSpacing: 0.4,
                textTransform: 'none',
                borderRadius: 1,
                ...((sx as object) ?? {}),
            }}
            {...rest}
        >
            {label}
        </Button>
    )
}
