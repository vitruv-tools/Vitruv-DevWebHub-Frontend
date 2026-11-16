// NOTE: AI-generated test (Claude Code), only lightly reviewed. It asserts current
// behavior; if it conflicts with the requirements, trust the requirements.
// Tests the useTreeNodes hook: empty trees without an open view, and ecore model
// and resource trees for an open view.

import { describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useTreeNodes } from './useTreeNodes.ts'
import type { ViewLogic } from './useViewLogic.ts'
import { EcoreModelApiToStructuredConverter } from '../../converter/ecore-model-api-to-structured-converter.ts'
import { EcoreModelToTreeConverter } from '../../converter/ecore-model-tree-converter.ts'
import { testHelperApiEcoreModel } from '../../../../test-helper/test-model/ecore-model/api-ecore-model.ts'

function viewLogic(view: unknown): ViewLogic {
    return { view, dispatchEditViewAction: vi.fn() } as unknown as ViewLogic
}

describe('useTreeNodes', () => {
    it('returns empty trees when no view is open', () => {
        const { result } = renderHook(() => useTreeNodes(viewLogic(undefined)))

        expect(result.current).toEqual({ ecoreModelTreeNodes: [], vsumTreeNodes: [] })
    })

    it('builds trees for the ecore models and resources of the open view', () => {
        const ecoreModel = new EcoreModelApiToStructuredConverter().convert(testHelperApiEcoreModel)
        const resource = {
            id: 'root',
            type: { name: 'Root' },
            attributes: [],
            simpleReferences: [],
            containmentReferences: [],
            propertiesWithErrors: [],
        }
        const logic = viewLogic({ ecoreModels: [ecoreModel], structuredResources: [resource] })

        const { result } = renderHook(() => useTreeNodes(logic))

        expect(result.current.ecoreModelTreeNodes).toEqual(
            new EcoreModelToTreeConverter().convert(ecoreModel),
        )
        expect(result.current.vsumTreeNodes).toEqual([
            expect.objectContaining({ id: 'root', label: 'Root', children: [], options: [] }),
        ])
    })
})
