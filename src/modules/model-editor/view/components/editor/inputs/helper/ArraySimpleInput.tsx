import TextField from '@mui/material/TextField'
import { Autocomplete } from '@mui/material'

interface Props {
    value: string[] | undefined
    onSubmit: (value: string | string[] | undefined, ignoreErrors: boolean) => boolean
    disabled?: boolean
}

/**
 * A React component that renders an input field allowing users to select or input multiple values.
 *
 * @param {Object} props - The properties passed to the component.
 * @param {boolean} props.disabled - Determines whether the input field is disabled.
 * @param {Array} props.value - The current values of the input field.
 * @param {function} props.onSubmit - A callback function invoked when the input values are updated.
 */
export function ArraySimpleInput({ disabled, value, onSubmit }: Props) {

    return (
        <Autocomplete
            sx={{ width: '100%' }}
            disabled={disabled}
            size='small'
            fullWidth
            multiple
            freeSolo
            options={[]}
            value={value ?? []}
            onChange={(_, values) => onSubmit(values, true)}
            renderInput={(params) => (
                <TextField {...params} />
            )}
        />
    )
}