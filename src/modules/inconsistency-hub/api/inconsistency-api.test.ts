import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
    addInconsistencyComment,
    getInconsistencyContext,
    getInconsistencyModelSnapshot,
    listInconsistencies,
    listInconsistencyComments,
    listInconsistencyViewUpdates,
    recordInconsistencyResolution,
} from './inconsistency-api.ts'
import type { VitruviusClient } from '../../model-editor/infra/vitruvius-client.ts'

function mockClient(handler: (path: string, init?: RequestInit) => Promise<Response>): VitruviusClient {
    return {
        request: vi.fn(async (path: string, init?: RequestInit) => handler(path, init)),
    } as unknown as VitruviusClient
}

describe('inconsistency-api', () => {
    beforeEach(() => {
        vi.restoreAllMocks()
    })

    it('lists with optional state filter', async () => {
        const client = mockClient(async path => {
            expect(path).toBe('/v1/inconsistencies?state=ALL')
            return new Response(JSON.stringify([{ id: '1', state: 'RESOLVED' }]), { status: 200 })
        })
        const items = await listInconsistencies(client, 'ALL')
        expect(items).toHaveLength(1)
        expect(items[0].state).toBe('RESOLVED')
    })

    it('posts and lists comments', async () => {
        const client = mockClient(async (path, init) => {
            if (path === '/v1/inconsistencies/abc/comments' && init?.method === 'POST') {
                expect(JSON.parse(String(init.body))).toEqual({ author: 'demo', body: 'hello' })
                return new Response(JSON.stringify({ id: 'c1', body: 'hello', author: 'demo' }), { status: 201 })
            }
            if (path === '/v1/inconsistencies/abc/comments') {
                return new Response(JSON.stringify([{ id: 'c1', body: 'hello', author: 'demo' }]), { status: 200 })
            }
            throw new Error(`unexpected ${path}`)
        })
        const created = await addInconsistencyComment(client, 'abc', { author: 'demo', body: 'hello' })
        expect(created.body).toBe('hello')
        const listed = await listInconsistencyComments(client, 'abc')
        expect(listed).toHaveLength(1)
    })

    it('records resolution metadata', async () => {
        const client = mockClient(async (path, init) => {
            expect(path).toBe('/v1/inconsistencies/abc/resolution')
            expect(init?.method).toBe('POST')
            expect(JSON.parse(String(init?.body))).toEqual({
                resolvedBy: 'demo',
                choice: 'linkComponent',
                comment: 'ok',
            })
            return new Response(JSON.stringify({
                id: 'abc',
                state: 'RESOLVED',
                resolvedBy: 'demo',
                resolutionChoice: 'linkComponent',
                resolutionComment: 'ok',
            }), { status: 200 })
        })
        const updated = await recordInconsistencyResolution(client, 'abc', {
            resolvedBy: 'demo',
            choice: 'linkComponent',
            comment: 'ok',
        })
        expect(updated.resolutionChoice).toBe('linkComponent')
    })

    it('lists view updates for commits tab', async () => {
        const client = mockClient(async path => {
            expect(path).toBe('/v1/inconsistencies/abc/view-updates')
            return new Response(JSON.stringify([{ id: 'u1', resourceSetLength: 12 }]), { status: 200 })
        })
        const updates = await listInconsistencyViewUpdates(client, 'abc')
        expect(updates[0].resourceSetLength).toBe(12)
    })

    it('loads inconsistency visualization context', async () => {
        const client = mockClient(async path => {
            expect(path).toBe('/v1/inconsistencies/abc/context')
            return new Response(JSON.stringify({
                inconsistencyId: 'abc',
                vsumId: 'v1',
                elements: [{ id: 'e1', displayName: 'Task Brake', eClassName: 'Task', metamodelName: 'amalthea', uri: 'u', role: 'source' }],
                correspondences: [],
            }), { status: 200 })
        })
        const context = await getInconsistencyContext(client, 'abc')
        expect(context.elements[0].displayName).toBe('Task Brake')
    })

    it('loads persisted model snapshot for visualization', async () => {
        const client = mockClient(async path => {
            expect(path).toBe('/v1/inconsistencies/abc/model')
            return new Response(JSON.stringify({
                inconsistencyId: 'abc',
                vsumId: 'v1',
                metamodelName: 'AmaltheaAscet',
                encodedResourceSet: JSON.stringify([
                    { uri: 'x', content: { eClass: 'http://example#//Root', _id: '/' } },
                ]),
            }), { status: 200 })
        })
        const snapshot = await getInconsistencyModelSnapshot(client, 'abc')
        expect(snapshot.metamodelName).toBe('AmaltheaAscet')
        expect(JSON.parse(snapshot.encodedResourceSet)).toHaveLength(1)
    })
})
