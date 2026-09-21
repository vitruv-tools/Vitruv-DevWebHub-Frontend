import type { InputError } from '../../../../types/error.ts'
import { useState } from 'react'
import { ColumnLayout, RowLayout } from '../../../../../../common/components/flex.tsx'
import { isNil } from '../../../../../../common/utils/nil-utils.ts'
import { IconButton } from '@mui/material'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import { InputErrorList } from './helper/InputErrorList.tsx'
import { ArraySimpleInput } from './helper/ArraySimpleInput.tsx'
import { ArrayOptionsInput } from './helper/ArrayOptionsInput.tsx'
import { SingleSimpleInput } from './helper/SingleSimpleInput.tsx'
import { SingleOptionsInput } from './helper/SingleOptionsInput.tsx'
import { ArraySimpleInputModal } from './helper/ArraySimpleInputModal.tsx'
import { SingleSimpleInputModal } from './helper/SingleSimpleInputModal.tsx'
import Box from '@mui/material/Box'
import { match } from '../../../../helpers/structured-resource-helpers.ts'

interface Props {
    isArray: boolean
    inputErrors: InputError[] | undefined
    onSubmit: (value: string | string[] | undefined, ignoreErrors: boolean) => boolean
    value: string | string[] | undefined
    options?: { key: string, label: string }[]
    disabled?: boolean
}

/**
 * A component for handling property input, which can support both single and array values.
 * Handles input rendering and modal toggling based on whether the input is an array and the presence of options.
 *
 * @param {Object} props - The props object.
 * @param {boolean} props.disabled - Indicates if the input should be disabled.
 * @param {boolean} props.isArray - Determines whether the input accepts array values or not.
 * @param {Array} props.inputErrors - List of input error messages to display.
 * @param {Function} props.onSubmit - Callback invoked when input is submitted.
 * @param {*} props.value - The value of the input, either a single value or an array of values.
 * @param {Array} [props.options] - Optional list of available options for the input.
 */
export function PropertyInput({ disabled, isArray, inputErrors, onSubmit, value, options }: Props) {
    const [showModal, setShowModal] = useState(false)

    function getArrayValue() {
        return match(
            value,
            nil => undefined,
            single => undefined,
            array => array.map(it => ensureStringValue(it)),
            isArray,
        )
    }

    function getSingleValue() {
        return match(
            value,
            nil => undefined,
            single => ensureStringValue(single),
            array => undefined,
            isArray,
        )
    }

    function ensureStringValue(value: any) {
        if (typeof value !== 'string') {
            return `${value}`
        }

        return value
    }

    const arrayValue = getArrayValue()
    const singleValue = getSingleValue()

    console.log(singleValue)

    return (
        <>
            <ColumnLayout sx={{ width: '100%', overflow: 'hidden' }}>
                <RowLayout sx={{ alignItems: 'center', gap: 1, width: '100%', overflow: 'hidden' }}>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        {
                            isArray
                                ? isNil(options)
                                    ? <ArraySimpleInput disabled={disabled} value={arrayValue} onSubmit={onSubmit} />
                                    : <ArrayOptionsInput
                                        disabled={disabled} value={arrayValue} onSubmit={onSubmit} options={options}
                                    />
                                : isNil(options)
                                    ? <SingleSimpleInput disabled={disabled} value={singleValue} onSubmit={onSubmit} />
                                    : <SingleOptionsInput
                                        disabled={disabled} value={singleValue} onSubmit={onSubmit} options={options}
                                    />
                        }
                    </Box>

                    {isNil(options) && (
                        <IconButton onClick={() => setShowModal(true)} size='small' tabIndex={-1}>
                            <MoreHorizIcon />
                        </IconButton>
                    )}
                </RowLayout>
                <InputErrorList inputErrors={inputErrors ?? []} />
            </ColumnLayout>
            {
                isArray
                    ? isNil(options)
                        ? <ArraySimpleInputModal
                            open={showModal}
                            close={() => setShowModal(false)}
                            value={arrayValue}
                            onSubmit={onSubmit}
                        />
                        : <></>
                    : isNil(options)
                        ? <SingleSimpleInputModal
                            open={showModal}
                            close={() => setShowModal(false)}
                            value={singleValue}
                            inputErrors={inputErrors ?? []}
                            onSubmit={onSubmit}
                        />
                        : <></>
            }
        </>
    )
}
