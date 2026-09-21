import TextField from '@mui/material/TextField'

interface Props {
    value: string | undefined
    onSubmit: (value: string | string[] | undefined, ignoreErrors: boolean) => boolean
    disabled?: boolean
}

/**
 * A functional component that renders a single simple input field with customizable behavior.
 *
 * @param {Object} props - The properties object.
 * @param {boolean} props.disabled - A boolean indicating whether the input field is disabled.
 * @param {string} props.value - The current value of the input field.
 * @param {function} props.onSubmit - A callback function invoked when the input value changes. It receives the updated value and a boolean flag as parameters.
 */
export function SingleSimpleInput({ disabled, value, onSubmit }: Props) {
    return (
        <TextField
            sx={{ width: '100%' }}
            value={value ?? ''}
            onChange={event => onSubmit(event.target.value, true)}
            disabled={disabled}
            size='small'
            fullWidth
            variant='standard'
        />
    )
}
