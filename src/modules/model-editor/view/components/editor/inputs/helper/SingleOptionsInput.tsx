import { Autocomplete } from '@mui/material'
import TextField from '@mui/material/TextField'
import { normalizeNil } from '../../../../../../../common/utils/nil-utils.ts'

interface Props {
    value: string | undefined
    onSubmit: (value: string | string[] | undefined, ignoreErrors: boolean) => boolean
    options: { key: string, label: string }[]
    disabled?: boolean
}

/**
 * Renders a single-option selection input with support for autocomplete functionality.
 *
 * @param {Object} props The properties for the component.
 * @param {boolean} props.disabled Indicates whether the input should be disabled.
 * @param {string | undefined} props.value The current value selected in the input.
 * @param {function} props.onSubmit Callback function triggered when the value changes,
 * it receives the selected option's key and a boolean indicating the change state.
 * @param {Array<Object>} props.options A list of options available for selection.
 * Each option is an object with a `key` property used to identify the option.
 */
export function SingleOptionsInput({ disabled, value, onSubmit, options }: Props) {
    function getOption(value: string | undefined) {
        return options?.find(it => it.key === value)
    }

    return (
        <Autocomplete
            sx={{ width: '100%' }}
            size='small'
            fullWidth
            disabled={disabled}
            options={options}
            value={getOption(value)}
            onChange={(_, value) => onSubmit(normalizeNil(value)?.key, true)}
            renderInput={(params) => (
                <TextField {...params} />
            )}
        />
    )
}