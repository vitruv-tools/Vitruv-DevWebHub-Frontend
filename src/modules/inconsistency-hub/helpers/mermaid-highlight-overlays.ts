import type { MermaidHighlightOptions } from '../../model-editor/converter/resources-structured-to-mermaid-converter.ts'
import { structuredResourceShortLabel } from '../../model-editor/helpers/display-helpers.ts'
import type { StructuredResource } from '../../model-editor/types/structured-resource.ts'

const SVG_NS = 'http://www.w3.org/2000/svg'
const RESOURCE_ATTR = 'data-hub-resource-id'
const INCONSISTENCY_STROKE = '#ff1744'
const SELECTION_STROKE = '#2979ff'
const HIGHLIGHT_LAYER_CLASS = 'inconsistency-highlight-layer'
const HIGHLIGHT_CLASS = 'inconsistency-highlight-ring'
const HIGHLIGHT_STROKE_WIDTH = 6
const HIGHLIGHT_GLOW_WIDTH = 11
const HIGHLIGHT_GAP = 2

type Bounds = {
    x: number
    y: number
    width: number
    height: number
}

type FrameStyle = {
    stroke: string
    strokeWidth: number
    glowWidth: number
    glowOpacity: number
}

const INCONSISTENCY_STYLE: FrameStyle = {
    stroke: INCONSISTENCY_STROKE,
    strokeWidth: HIGHLIGHT_STROKE_WIDTH,
    glowWidth: HIGHLIGHT_GLOW_WIDTH,
    glowOpacity: 0.45,
}

/** Tighter red ring when the inconsistency node is also selected (stays inside blue). */
const INNER_INCONSISTENCY_STYLE: FrameStyle = {
    stroke: INCONSISTENCY_STROKE,
    strokeWidth: 5,
    glowWidth: 8,
    glowOpacity: 0.4,
}

const SELECTION_STYLE: FrameStyle = {
    stroke: SELECTION_STROKE,
    strokeWidth: 7,
    glowWidth: 14,
    glowOpacity: 0.55,
}

/** Larger blue ring when stacked on the inconsistency node (outer selection). */
const OUTER_SELECTION_STYLE: FrameStyle = {
    stroke: SELECTION_STROKE,
    strokeWidth: 7,
    glowWidth: 14,
    glowOpacity: 0.5,
}

/**
 * Tags Mermaid node groups with stable resource ids so click + highlight are reliable.
 * Only leaf class/node groups are tagged — never large parent containers (System/Root wrappers).
 */
export function tagMermaidResourceNodes(
    svg: SVGSVGElement,
    resourceIdToMermaidId: Record<string, string>,
    resourcesById: Map<string, StructuredResource>,
): void {
    const mermaidEntries = Object.entries(resourceIdToMermaidId)
        .map(([resourceId, mermaidId]) => ({ resourceId, mermaidId }))
        // Longer ids first so `n12` wins over substring `n1`.
        .sort((a, b) => b.mermaidId.length - a.mermaidId.length)

    for (const group of collectCandidateGroups(svg)) {
        // Drop previous tags so re-paints stay accurate.
        group.removeAttribute(RESOURCE_ATTR)

        let resourceId: string | null = null
        for (const entry of mermaidEntries) {
            if (groupIdMatchesMermaidId(group.id, entry.mermaidId)) {
                resourceId = entry.resourceId
                break
            }
        }

        if (!resourceId) {
            resourceId = resolveResourceIdByLabel(group, resourcesById)
        }

        if (resourceId) {
            group.setAttribute(RESOURCE_ATTR, resourceId)
            group.style.cursor = 'pointer'
        }
    }
}

/**
 * Resolve the diagram resource under a pointer. Prefers the smallest tagged node at the
 * point so nested Entity/Server boxes win over parent System/Root containers.
 */
export function findResourceIdFromPointer(
    clientX: number,
    clientY: number,
    svg?: SVGSVGElement | null,
): string | null {
    const stack = typeof document !== 'undefined'
        ? document.elementsFromPoint(clientX, clientY)
        : []

    let best: { resourceId: string, area: number } | null = null
    const seen = new Set<Element>()

    for (const element of stack) {
        if (!(element instanceof Element)) {
            continue
        }
        if (element.closest(`g.${HIGHLIGHT_LAYER_CLASS}`)) {
            continue
        }

        const tagged = element.closest(`[${RESOURCE_ATTR}]`)
        if (!(tagged instanceof Element) || seen.has(tagged)) {
            continue
        }
        seen.add(tagged)

        const resourceId = tagged.getAttribute(RESOURCE_ATTR)
        if (!resourceId) {
            continue
        }

        const area = elementArea(tagged)
        if (!best || area < best.area) {
            best = { resourceId, area }
        }
    }

    if (best) {
        return best.resourceId
    }

    if (svg) {
        return findResourceIdByHitTest(svg, clientX, clientY)
    }

    return null
}

function groupIdMatchesMermaidId(groupId: string, mermaidId: string): boolean {
    if (!groupId || !mermaidId) {
        return false
    }
    if (groupId === mermaidId) {
        return true
    }
    if (groupId.startsWith(`classId-${mermaidId}-`) || groupId === `classId-${mermaidId}`) {
        return true
    }
    if (groupId.startsWith(`${mermaidId}-`) || groupId.endsWith(`-${mermaidId}`)) {
        return true
    }
    if (groupId.includes(`-${mermaidId}-`)) {
        return true
    }
    return false
}

/**
 * Draws highlight frames: red for inconsistency root (always), blue for explicit user selection.
 */
export function applyInconsistencyHighlightOverlays(
    svg: SVGSVGElement,
    highlightOptions: MermaidHighlightOptions | undefined,
    resourceIdToMermaidId: Record<string, string>,
    resourcesById?: Map<string, StructuredResource>,
): void {
    clearHighlightLayer(svg)

    if (!highlightOptions) {
        return
    }

    if (resourcesById) {
        tagMermaidResourceNodes(svg, resourceIdToMermaidId, resourcesById)
    }

    // Always measure against the original Mermaid viewBox (not a previously expanded one).
    restoreBaseViewBox(svg)

    const layer = ensureHighlightLayer(svg)

    const drawForResource = (
        resourceId: string | null | undefined,
        style: FrameStyle,
        paddingOverride?: number,
    ): Bounds | null => {
        if (!resourceId) {
            return null
        }

        const mermaidId = resourceIdToMermaidId[resourceId]
        const resource = resourcesById?.get(resourceId)
        const nodeGroup = findTaggedNode(svg, resourceId)
            ?? findMermaidNodeGroup(svg, mermaidId, resource)

        if (!nodeGroup) {
            return null
        }

        const bounds = getBoundsInSvgSpace(svg, nodeGroup)
        if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
            return null
        }

        const padding = paddingOverride ?? (style.strokeWidth / 2 + HIGHLIGHT_GAP)
        const frame = expandBounds(bounds, padding)
        appendHighlightFrame(layer, frame, style)
        return frame
    }

    const frames: Bounds[] = []
    const rootIds = resolveRootResourceIds(highlightOptions)
    const selectedId = highlightOptions.selectedResourceId ?? null
    const selectedIsInconsistency = selectedId != null && rootIds.includes(selectedId)

    for (const rootId of rootIds) {
        const style = selectedIsInconsistency && selectedId === rootId
            ? INNER_INCONSISTENCY_STYLE
            : INCONSISTENCY_STYLE
        const padding = selectedIsInconsistency && selectedId === rootId ? 3 : undefined
        const frame = drawForResource(rootId, style, padding)
        if (frame) {
            frames.push(frame)
        }
    }

    if (selectedId) {
        const padding = selectedIsInconsistency ? 12 : undefined
        const style = selectedIsInconsistency ? OUTER_SELECTION_STYLE : SELECTION_STYLE
        const selectionFrame = drawForResource(selectedId, style, padding)
        if (selectionFrame) {
            frames.push(selectionFrame)
        }
    }

    if (frames.length > 0) {
        expandSvgViewBoxForHighlights(svg, frames)
        svg.style.overflow = 'visible'
    }
}

function resolveRootResourceIds(highlightOptions: MermaidHighlightOptions): string[] {
    const fromList = (highlightOptions.rootResourceIds ?? []).filter(
        (id): id is string => typeof id === 'string' && id.length > 0,
    )
    if (fromList.length > 0) {
        return [...new Set(fromList)]
    }
    const single = highlightOptions.rootResourceId
    return single ? [single] : []
}

function collectCandidateGroups(svg: SVGSVGElement): SVGGElement[] {
    const groups = new Set<SVGGElement>()

    for (const group of svg.querySelectorAll('g.node, g.classGroup')) {
        if (!(group instanceof SVGGElement)) {
            continue
        }
        // Skip cluster/parent wrappers that contain other class nodes.
        if (group.querySelector('g.node, g.classGroup')) {
            continue
        }
        groups.add(group)
    }

    // Legacy Mermaid class ids without .node/.classGroup on the outer group.
    for (const group of svg.querySelectorAll('g[id^="classId-"]')) {
        if (!(group instanceof SVGGElement)) {
            continue
        }
        if (group.querySelector('g.node, g.classGroup, g[id^="classId-"]')) {
            continue
        }
        groups.add(group)
    }

    return [...groups]
}

function findResourceIdByHitTest(svg: SVGSVGElement, clientX: number, clientY: number): string | null {
    let best: { resourceId: string, area: number } | null = null

    for (const node of svg.querySelectorAll(`[${RESOURCE_ATTR}]`)) {
        if (!(node instanceof Element)) {
            continue
        }
        const rect = node.getBoundingClientRect()
        if (rect.width <= 0 || rect.height <= 0) {
            continue
        }
        if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
            continue
        }
        const resourceId = node.getAttribute(RESOURCE_ATTR)
        if (!resourceId) {
            continue
        }
        const area = rect.width * rect.height
        if (!best || area < best.area) {
            best = { resourceId, area }
        }
    }

    return best?.resourceId ?? null
}

function elementArea(element: Element): number {
    try {
        if (element instanceof SVGGraphicsElement) {
            const box = element.getBBox()
            const area = box.width * box.height
            if (area > 0) {
                return area
            }
        }
    } catch {
        // fall through to screen rect
    }
    const rect = element.getBoundingClientRect()
    return Math.max(1, rect.width * rect.height)
}

function findTaggedNode(svg: SVGSVGElement, resourceId: string): SVGGElement | null {
    for (const node of svg.querySelectorAll(`[${RESOURCE_ATTR}]`)) {
        if (node instanceof SVGGElement && node.getAttribute(RESOURCE_ATTR) === resourceId) {
            return node
        }
    }
    return null
}

function resolveResourceIdByLabel(
    group: SVGGElement,
    resourcesById: Map<string, StructuredResource>,
): string | null {
    const title = normalizeText(
        group.querySelector('.label-group, .nodeLabel, .classTitle, .label, .labelText')?.textContent
        ?? '',
    )
    const candidates = title
        ? [...resourcesById.values()].filter(resource => {
            const label = normalizeText(structuredResourceShortLabel(resource, 40))
            return label !== '' && (title === label || title.startsWith(label))
        })
        : []

    if (candidates.length === 1) {
        return candidates[0].id
    }

    // Exact short-label match on full node text (no loose includes — avoids System matching a parent).
    const text = normalizeText(group.textContent ?? '')
    const exact = [...resourcesById.values()].filter(resource => {
        const label = normalizeText(structuredResourceShortLabel(resource, 40))
        return label !== '' && (text === label || text.startsWith(`${label} `) || text.startsWith(`${label}:`))
    })
    return exact.length === 1 ? exact[0].id : null
}

function clearHighlightLayer(svg: SVGSVGElement): void {
    const layer = svg.querySelector(`g.${HIGHLIGHT_LAYER_CLASS}`)
    layer?.replaceChildren()
}

function ensureHighlightLayer(svg: SVGSVGElement): SVGGElement {
    const existing = svg.querySelector(`g.${HIGHLIGHT_LAYER_CLASS}`)
    if (existing instanceof SVGGElement) {
        return existing
    }

    const layer = document.createElementNS(SVG_NS, 'g')
    layer.setAttribute('class', HIGHLIGHT_LAYER_CLASS)
    layer.setAttribute('pointer-events', 'none')
    svg.appendChild(layer)
    return layer
}

function findMermaidNodeGroup(
    svg: SVGSVGElement,
    mermaidId: string | undefined,
    resource: StructuredResource | undefined,
): SVGGElement | null {
    if (mermaidId) {
        const matches = collectCandidateGroups(svg).filter(group =>
            groupIdMatchesMermaidId(group.id, mermaidId),
        )
        if (matches.length === 1) {
            return matches[0]
        }
        if (matches.length > 1) {
            return pickSmallestNode(matches)
        }
    }

    if (!resource) {
        return null
    }

    const label = normalizeText(structuredResourceShortLabel(resource, 40))
    const matches = collectCandidateGroups(svg).filter(group => nodeTitleMatches(group, label))
    return matches.length === 1 ? matches[0] : pickSmallestNode(matches)
}

function pickSmallestNode(nodes: SVGGElement[]): SVGGElement | null {
    if (nodes.length === 0) {
        return null
    }

    return nodes.reduce((best, node) => {
        try {
            const area = node.getBBox().width * node.getBBox().height
            const bestArea = best.getBBox().width * best.getBBox().height
            return area < bestArea ? node : best
        } catch {
            return best
        }
    })
}

function nodeTitleMatches(group: SVGGElement, label: string): boolean {
    const title = group.querySelector('.nodeLabel, .classTitle, .label, .labelText')?.textContent
    if (title && normalizeText(title) === label) {
        return true
    }
    const text = normalizeText(group.textContent ?? '')
    return text === label || text.startsWith(`${label} `)
}

/**
 * Prefer screen→SVG mapping after CSS resize; fall back to CTM / local bbox.
 */
function getBoundsInSvgSpace(svg: SVGSVGElement, nodeGroup: SVGGElement): Bounds | null {
    try {
        const screenCtm = svg.getScreenCTM()
        if (screenCtm) {
            const rect = nodeGroup.getBoundingClientRect()
            if (rect.width > 0 && rect.height > 0) {
                const topLeft = svg.createSVGPoint()
                topLeft.x = rect.left
                topLeft.y = rect.top
                const bottomRight = svg.createSVGPoint()
                bottomRight.x = rect.right
                bottomRight.y = rect.bottom
                const p1 = topLeft.matrixTransform(screenCtm.inverse())
                const p2 = bottomRight.matrixTransform(screenCtm.inverse())
                return {
                    x: Math.min(p1.x, p2.x),
                    y: Math.min(p1.y, p2.y),
                    width: Math.abs(p2.x - p1.x),
                    height: Math.abs(p2.y - p1.y),
                }
            }
        }
    } catch {
        // fall through
    }

    try {
        const local = nodeGroup.getBBox()
        const nodeCtm = nodeGroup.getCTM()
        const svgCtm = svg.getCTM()
        if (!nodeCtm || !svgCtm) {
            return {
                x: local.x,
                y: local.y,
                width: local.width,
                height: local.height,
            }
        }

        const toSvgUserSpace = svgCtm.inverse().multiply(nodeCtm)
        return transformRect(local, toSvgUserSpace)
    } catch {
        return null
    }
}

function transformRect(bbox: DOMRect, matrix: DOMMatrix): Bounds {
    const corners = [
        { x: bbox.x, y: bbox.y },
        { x: bbox.x + bbox.width, y: bbox.y },
        { x: bbox.x + bbox.width, y: bbox.y + bbox.height },
        { x: bbox.x, y: bbox.y + bbox.height },
    ].map(point => {
        const transformed = new DOMPoint(point.x, point.y).matrixTransform(matrix)
        return { x: transformed.x, y: transformed.y }
    })

    const xs = corners.map(point => point.x)
    const ys = corners.map(point => point.y)

    return {
        x: Math.min(...xs),
        y: Math.min(...ys),
        width: Math.max(...xs) - Math.min(...xs),
        height: Math.max(...ys) - Math.min(...ys),
    }
}

function expandBounds(bounds: Bounds, padding: number): Bounds {
    return {
        x: bounds.x - padding,
        y: bounds.y - padding,
        width: bounds.width + padding * 2,
        height: bounds.height + padding * 2,
    }
}

function appendHighlightFrame(layer: SVGGElement, bounds: Bounds, style: FrameStyle): void {
    if (style.glowWidth > 0) {
        const glowPad = 3
        const glow = document.createElementNS(SVG_NS, 'rect')
        glow.setAttribute('x', String(bounds.x - glowPad))
        glow.setAttribute('y', String(bounds.y - glowPad))
        glow.setAttribute('width', String(bounds.width + glowPad * 2))
        glow.setAttribute('height', String(bounds.height + glowPad * 2))
        glow.setAttribute('rx', '8')
        glow.setAttribute('fill', 'none')
        glow.setAttribute('stroke', style.stroke)
        glow.setAttribute('stroke-width', String(style.glowWidth))
        glow.setAttribute('stroke-opacity', String(style.glowOpacity))
        glow.setAttribute('class', HIGHLIGHT_CLASS)
        glow.setAttribute('pointer-events', 'none')
        layer.appendChild(glow)
    }

    const ring = document.createElementNS(SVG_NS, 'rect')
    ring.setAttribute('x', String(bounds.x))
    ring.setAttribute('y', String(bounds.y))
    ring.setAttribute('width', String(bounds.width))
    ring.setAttribute('height', String(bounds.height))
    ring.setAttribute('rx', '6')
    ring.setAttribute('fill', 'none')
    ring.setAttribute('stroke', style.stroke)
    ring.setAttribute('stroke-width', String(style.strokeWidth))
    ring.setAttribute('class', HIGHLIGHT_CLASS)
    ring.setAttribute('pointer-events', 'none')
    layer.appendChild(ring)
}

function readCurrentViewBox(svg: SVGSVGElement): Bounds {
    const viewBox = svg.viewBox.baseVal
    if (viewBox.width > 0 && viewBox.height > 0) {
        return {
            x: viewBox.x,
            y: viewBox.y,
            width: viewBox.width,
            height: viewBox.height,
        }
    }

    return {
        x: 0,
        y: 0,
        width: Number.parseFloat(svg.getAttribute('width') ?? '0'),
        height: Number.parseFloat(svg.getAttribute('height') ?? '0'),
    }
}

/** Expand from the original Mermaid viewBox (stored once) so repeated paints do not keep growing. */
function expandSvgViewBoxForHighlights(svg: SVGSVGElement, frames: Bounds[]): void {
    const base = readBaseViewBox(svg)
    let x = base.x
    let y = base.y
    let right = base.x + base.width
    let bottom = base.y + base.height

    for (const frame of frames) {
        const padded = expandBounds(frame, HIGHLIGHT_GLOW_WIDTH / 2 + 4)
        x = Math.min(x, padded.x)
        y = Math.min(y, padded.y)
        right = Math.max(right, padded.x + padded.width)
        bottom = Math.max(bottom, padded.y + padded.height)
    }

    svg.setAttribute('viewBox', `${x} ${y} ${right - x} ${bottom - y}`)
}

function readBaseViewBox(svg: SVGSVGElement): Bounds {
    const stored = svg.getAttribute('data-hub-base-viewbox')
    if (stored) {
        const [x, y, width, height] = stored.split(' ').map(Number)
        if ([x, y, width, height].every(value => Number.isFinite(value)) && width > 0 && height > 0) {
            return { x, y, width, height }
        }
    }

    const current = readCurrentViewBox(svg)
    svg.setAttribute(
        'data-hub-base-viewbox',
        `${current.x} ${current.y} ${current.width} ${current.height}`,
    )
    return current
}

function restoreBaseViewBox(svg: SVGSVGElement): void {
    const base = readBaseViewBox(svg)
    svg.setAttribute('viewBox', `${base.x} ${base.y} ${base.width} ${base.height}`)
}

function normalizeText(value: string): string {
    return value.replace(/\s+/g, ' ').trim()
}
