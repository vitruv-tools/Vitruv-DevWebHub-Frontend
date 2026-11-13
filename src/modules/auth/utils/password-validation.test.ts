// NOTE: AI-generated test (Claude Code), only lightly reviewed. It asserts current
// behavior; if it conflicts with the requirements, trust the requirements.
// Tests the password rules (length, lowercase, uppercase, digit, special character)
// and the error message shown for the first rule a password breaks.

import { describe, expect, it } from 'vitest'
import { isPasswordValid, passwordValidationMessage } from './password-validation.ts'

describe('isPasswordValid', () => {
    it('accepts a password with lowercase, uppercase, digit and special character', () => {
        expect(isPasswordValid('Password1!')).toBe(true)
    })

    it('rejects passwords that are too short or too long', () => {
        expect(isPasswordValid('Pa1!')).toBe(false)
        expect(isPasswordValid('Pa1!' + 'a'.repeat(253))).toBe(false)
    })

    it.each([
        ['missing lowercase', 'PASSWORD1!'],
        ['missing uppercase', 'password1!'],
        ['missing digit', 'Password!!'],
        ['missing special character', 'Password12'],
    ])('rejects a password %s', (_case, password) => {
        expect(isPasswordValid(password)).toBe(false)
    })
})

describe('passwordValidationMessage', () => {
    it.each([
        ['Pa1!', 'Password must be at least 8 characters long.'],
        ['PASSWORD1!', 'Password must include a lowercase letter.'],
        ['password1!', 'Password must include an uppercase letter.'],
        ['Password!!', 'Password must include a number.'],
        ['Password12', 'Password must include a special character.'],
    ])('reports the first problem of %s', (password, message) => {
        expect(passwordValidationMessage(password)).toBe(message)
    })

    it('returns null for a valid password', () => {
        expect(passwordValidationMessage('Password1!')).toBeNull()
    })
})
