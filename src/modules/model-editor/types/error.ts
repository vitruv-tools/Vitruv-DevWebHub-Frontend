export type InputError = {
    message: string,
    severity: InputErrorSeverity
}

export type InputErrorSeverity = 'reject' | 'warn'
