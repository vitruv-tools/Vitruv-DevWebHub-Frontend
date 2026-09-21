import { Typography } from '@mui/material'
import type { InputError } from '../../../../../types/error.ts'

interface Props {
    inputErrors: InputError[]
}

/**
 * Renders a list of input error messages with corresponding severity styling.
 *
 * @param {Object} props - The properties passed to the component.
 * @param {Array} props.inputErrors - An array of error objects containing details about input errors.
 * @param {string} props.inputErrors[].message - The error message to display.
 * @param {string} props.inputErrors[].severity - The severity of the error, typically 'reject' or 'warning'.
 */
export function InputErrorList({ inputErrors }: Props) {
    return inputErrors.map(it => (
        <Typography
            key={it.message}
            color={it.severity === 'reject' ? 'error' : 'warning'}
        >
            {it.message}
        </Typography>
    ))
}
