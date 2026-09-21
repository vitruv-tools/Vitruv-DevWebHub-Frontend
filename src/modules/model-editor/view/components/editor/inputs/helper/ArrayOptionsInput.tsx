import TextField from '@mui/material/TextField'
import { Autocomplete } from '@mui/material'

interface Props {
    value: string[] | undefined
    onSubmit: (value: string | string[] | undefined, ignoreErrors: boolean) => boolean
    options: { key: string, label: string }[]
    disabled?: boolean
}

/**
 * A component that renders an autocomplete input field for selecting multiple options from a predefined list.
 *
 * @param {Object} props - Component properties.
 * @param {boolean} props.disabled - Indicates whether the input field is disabled.
 * @param {string[]} props.value - The current selected values as an array of keys.
 * @param {function} props.onSubmit - Callback function triggered when the selection changes. Receives the updated array of selected keys and a boolean flag.
 * @param {Array<{ key: string, label: string }>} props.options - The list of available options, each containing a `key` and `label`.
 */
export function ArrayOptionsInput({ disabled, value, onSubmit, options }: Props) {
    function getOptions(value: string[]) {
        return options?.filter(it => value.includes(it.key))
    }

    return (
        <Autocomplete
            sx={{ width: '100%' }}
            size='small'
            fullWidth
            multiple
            disabled={disabled}
            value={getOptions(value ?? [])}
            options={options}
            getOptionKey={option => option.key}
            getOptionLabel={option => option.label}
            onChange={(_, value) => onSubmit(value.map(it => it.key), true)}
            renderInput={(params) => (
                <TextField {...params} />
            )}
        />
    )
}
