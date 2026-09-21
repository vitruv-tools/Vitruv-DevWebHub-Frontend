export function isPasswordValid(password: string): boolean {
    if (password.length < 8 || password.length > 256) {
        return false
    }
    return /\p{Ll}/u.test(password)
        && /\p{Lu}/u.test(password)
        && /\p{Nd}/u.test(password)
        && /[^\p{L}\p{Nd}\s]/u.test(password)
}

export function passwordValidationMessage(password: string): string | null {
    if (password.length < 8) {
        return 'Password must be at least 8 characters long.'
    }
    if (!/\p{Ll}/u.test(password)) {
        return 'Password must include a lowercase letter.'
    }
    if (!/\p{Lu}/u.test(password)) {
        return 'Password must include an uppercase letter.'
    }
    if (!/\p{Nd}/u.test(password)) {
        return 'Password must include a number.'
    }
    if (!/[^\p{L}\p{Nd}\s]/u.test(password)) {
        return 'Password must include a special character.'
    }
    return null
}
