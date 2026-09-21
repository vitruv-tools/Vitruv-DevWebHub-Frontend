import { describe, expect, it } from 'vitest'
import { formatSourceTargetRelation, resolveSourceTargetRelation } from './source-target-relation.ts'

describe('source-target-relation', () => {
    it('maps AmaltheaAscet to Amalthea → Ascet', () => {
        expect(resolveSourceTargetRelation('AmaltheaAscet')).toEqual({
            source: 'Amalthea',
            target: 'Ascet',
        })
        expect(formatSourceTargetRelation('AmaltheaAscet')).toBe('Amalthea → Ascet')
    })

    it('maps SystemRootVsum to System → Root', () => {
        expect(formatSourceTargetRelation('SystemRootVsum')).toBe('System → Root')
    })

    it('returns null for unknown metamodels', () => {
        expect(formatSourceTargetRelation('Unknown')).toBeNull()
        expect(formatSourceTargetRelation(null)).toBeNull()
    })
})
