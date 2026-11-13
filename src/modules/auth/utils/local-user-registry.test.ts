// NOTE: AI-generated test (Claude Code), only lightly reviewed. It asserts current
// behavior; if it conflicts with the requirements, trust the requirements.
// Tests the localStorage-based user registry used when the auth server is offline:
// finding users, rejecting duplicate usernames/emails and handling corrupt storage.

import { beforeEach, describe, expect, it } from 'vitest'
import { findLocalUser, registerLocalUser } from './local-user-registry.ts'
import type { SignUpCredentials } from '../types/auth-types.ts'

const STORAGE_KEY = 'auth.local-users'

const ada: SignUpCredentials = {
    username: 'Ada',
    email: 'ada@example.org',
    password: 'Password1!',
    firstName: 'Ada',
    lastName: 'Lovelace',
    roleType: 'user',
}

describe('local user registry', () => {
    beforeEach(() => {
        localStorage.removeItem(STORAGE_KEY)
    })

    it('finds a registered user by username or email, ignoring case', () => {
        registerLocalUser(ada)

        expect(findLocalUser(' ada ', 'Password1!')).toEqual(ada)
        expect(findLocalUser('ADA@example.org', 'Password1!')).toEqual(ada)
        expect(findLocalUser('ada', 'wrong')).toBeUndefined()
    })

    it('rejects a taken username or email', () => {
        registerLocalUser(ada)

        expect(() => registerLocalUser({ ...ada, email: 'other@example.org' })).toThrow(
            'Username is already used',
        )
        expect(() => registerLocalUser({ ...ada, username: 'other' })).toThrow(
            'Email is already used',
        )
    })

    it('treats corrupt or unexpected storage content as empty', () => {
        localStorage.setItem(STORAGE_KEY, '{not json')
        expect(findLocalUser('ada', 'Password1!')).toBeUndefined()

        localStorage.setItem(STORAGE_KEY, '{"username":"ada"}')
        expect(findLocalUser('ada', 'Password1!')).toBeUndefined()
    })
})
