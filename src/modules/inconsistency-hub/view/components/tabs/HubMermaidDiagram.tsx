import { useEffect, useId, useMemo, useRef } from 'react'
import mermaid from 'mermaid'
import { useTheme } from '@mui/material'
import { isNil } from '../../../../../common/utils/nil-utils.ts'
import type { StructuredResource } from '../../../../model-editor/types/structured-resource.ts'
import { getAllStructuredResources } from '../../../../model-editor/helpers/structured-resource-helpers.ts'
import {
    ResourcesStructuredToMermaidConverter,
    type MermaidHighlightOptions,
} from '../../../../model-editor/converter/resources-structured-to-mermaid-converter.ts'
import {
    applyInconsistencyHighlightOverlays,
    findResourceIdFromPointer,
    tagMermaidResourceNodes,
} from '../../../helpers/mermaid-highlight-overlays.ts'

type Props = {
    structuredResources: StructuredResource[]
    highlightOptions?: MermaidHighlightOptions
    onSelectResource?: (resourceId: string) => void
}

type CompactViewState = {
    baseScale: number
    zoom: number
    panX: number
    panY: number
    vbWidth: number
    vbHeight: number
}

/**
 * Hub Mermaid: sharp zoom, red inconsistency highlight, blue only after click, click-vs-pan aware.
 */
export function HubMermaidDiagram({ structuredResources, highlightOptions, onSelectResource }: Props) {
    const { code, resourceIdToMermaidId } = useMemo(() => {
        const converter = new ResourcesStructuredToMermaidConverter()
        return {
            code: converter.convertAll(structuredResources),
            resourceIdToMermaidId: converter.getResourceIdToMermaidIdMap(),
        }
    }, [structuredResources])

    const resourcesById = useMemo(
        () => new Map(getAllStructuredResources(structuredResources).map(resource => [resource.id, resource])),
        [structuredResources],
    )

    const id = useId().replace(/:/g, '_')
    const viewportRef = useRef<HTMLDivElement | null>(null)
    const containerRef = useRef<HTMLDivElement | null>(null)
    const svgRef = useRef<SVGSVGElement | null>(null)
    const stageRef = useRef<HTMLDivElement | null>(null)
    const compactStateRef = useRef<CompactViewState | null>(null)
    const resizeObserverRef = useRef<ResizeObserver | null>(null)
    const interactionCleanupRef = useRef<(() => void) | null>(null)
    const onSelectRef = useRef(onSelectResource)
    onSelectRef.current = onSelectResource
    const highlightRef = useRef(highlightOptions)
    highlightRef.current = highlightOptions
    const mapsRef = useRef({ resourceIdToMermaidId, resourcesById })
    mapsRef.current = { resourceIdToMermaidId, resourcesById }

    const theme = useTheme()

    useEffect(() => {
        mermaid.initialize({
            startOnLoad: false,
            securityLevel: 'strict',
            theme: theme.palette.mode === 'dark' ? 'dark' : 'default',
            flowchart: {
                useMaxWidth: false,
            },
        })
    }, [theme.palette.mode])

    useEffect(() => {
        let cancelled = false

        async function render() {
            if (isNil(code)) {
                return
            }

            const viewport = viewportRef.current
            const container = containerRef.current
            if (!viewport || !container) {
                return
            }

            interactionCleanupRef.current?.()
            interactionCleanupRef.current = null
            resizeObserverRef.current?.disconnect()
            resizeObserverRef.current = null
            svgRef.current = null
            stageRef.current = null

            container.innerHTML = ''
            container.style.cssText = ''
            viewport.style.cursor = ''

            try {
                const result = await mermaid.render(`hub_mermaid_${id}`, code)
                if (cancelled) {
                    return
                }

                const svg = parseSvgFromRenderResult(result, container)
                if (!svg) {
                    return
                }

                const stage = document.createElement('div')
                stage.style.position = 'absolute'
                stage.style.top = '0'
                stage.style.left = '0'
                stage.style.transformOrigin = '0 0'
                stage.appendChild(svg)
                container.appendChild(stage)
                container.style.position = 'relative'
                container.style.width = '100%'
                container.style.height = '100%'
                container.style.overflow = 'hidden'

                svg.style.display = 'block'
                svg.style.overflow = 'visible'
                svg.style.shapeRendering = 'geometricPrecision'
                svg.style.textRendering = 'geometricPrecision'

                svgRef.current = svg
                stageRef.current = stage

                const viewBox = readViewBox(svg)
                if (!viewBox) {
                    return
                }

                compactStateRef.current = {
                    baseScale: 1,
                    zoom: 1,
                    panX: 0,
                    panY: 0,
                    vbWidth: viewBox.width,
                    vbHeight: viewBox.height,
                }

                const paintView = () => {
                    const state = compactStateRef.current
                    const currentSvg = svgRef.current
                    const currentStage = stageRef.current
                    if (!state || !currentSvg || !currentStage) {
                        return
                    }
                    applySvgPixelSize(currentSvg, state.vbWidth, state.vbHeight, state.baseScale * state.zoom)
                    currentStage.style.transform = `translate(${state.panX}px, ${state.panY}px)`
                }

                const paintHighlights = () => {
                    const currentSvg = svgRef.current
                    const state = compactStateRef.current
                    if (!currentSvg || !state) {
                        return
                    }
                    const maps = mapsRef.current
                    tagMermaidResourceNodes(currentSvg, maps.resourceIdToMermaidId, maps.resourcesById)
                    applyInconsistencyHighlightOverlays(
                        currentSvg,
                        highlightRef.current,
                        maps.resourceIdToMermaidId,
                        maps.resourcesById,
                    )
                    const updatedViewBox = readViewBox(currentSvg)
                    if (updatedViewBox) {
                        state.vbWidth = updatedViewBox.width
                        state.vbHeight = updatedViewBox.height
                    }
                    paintView()
                }

                const applyCompactLayout = (preserveUserView = false) => {
                    const state = compactStateRef.current
                    if (!state) {
                        return
                    }

                    const prevZoom = state.zoom
                    const prevPanX = state.panX
                    const prevPanY = state.panY

                    const availableWidth = Math.max(viewport.clientWidth, 120)
                    const availableHeight = Math.max(viewport.clientHeight, 120)
                    state.baseScale = Math.min(
                        availableWidth / state.vbWidth,
                        availableHeight / state.vbHeight,
                    ) * 0.92

                    if (preserveUserView) {
                        state.zoom = prevZoom
                        state.panX = prevPanX
                        state.panY = prevPanY
                    } else {
                        state.zoom = 1
                        centerCompactView(viewport, state)
                    }

                    paintView()
                    // Two frames: layout/CTM must settle after CSS size changes.
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            paintHighlights()
                        })
                    })
                }

                applyCompactLayout(false)

                interactionCleanupRef.current = attachDiagramInteraction(
                    viewport,
                    () => compactStateRef.current,
                    () => {
                        paintView()
                    },
                    resourceId => onSelectRef.current?.(resourceId),
                    () => svgRef.current,
                )

                resizeObserverRef.current = new ResizeObserver(() => {
                    applyCompactLayout(true)
                })
                resizeObserverRef.current.observe(viewport)
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : 'Unknown Mermaid render error'

                container.innerHTML = `<pre style='white-space:pre-wrap'>${escapeHtml(
                    code,
                )}\n\n⚠️ ${escapeHtml(message)}</pre>`
            }
        }

        void render()

        return () => {
            cancelled = true
            resizeObserverRef.current?.disconnect()
            resizeObserverRef.current = null
            interactionCleanupRef.current?.()
            interactionCleanupRef.current = null
            svgRef.current = null
            stageRef.current = null
        }
    }, [code, id, theme.palette.mode])

    useEffect(() => {
        const svg = svgRef.current
        const state = compactStateRef.current
        const stage = stageRef.current
        if (!svg || !state || !stage) {
            return
        }
        applySvgPixelSize(svg, state.vbWidth, state.vbHeight, state.baseScale * state.zoom)
        stage.style.transform = `translate(${state.panX}px, ${state.panY}px)`
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (svgRef.current !== svg || !compactStateRef.current) {
                    return
                }
                applyInconsistencyHighlightOverlays(svg, highlightOptions, resourceIdToMermaidId, resourcesById)
                const updatedViewBox = readViewBox(svg)
                if (updatedViewBox) {
                    compactStateRef.current.vbWidth = updatedViewBox.width
                    compactStateRef.current.vbHeight = updatedViewBox.height
                    applySvgPixelSize(
                        svg,
                        updatedViewBox.width,
                        updatedViewBox.height,
                        compactStateRef.current.baseScale * compactStateRef.current.zoom,
                    )
                }
            })
        })
    }, [highlightOptions, resourceIdToMermaidId, resourcesById])

    return (
        <div
            ref={viewportRef}
            style={{
                width: '100%',
                height: '100%',
                minHeight: 0,
                overflow: 'hidden',
                position: 'relative',
                boxSizing: 'border-box',
            }}
        >
            <div
                ref={containerRef}
                style={{
                    width: '100%',
                    height: '100%',
                }}
            />
        </div>
    )
}

function attachDiagramInteraction(
    viewport: HTMLDivElement,
    getState: () => CompactViewState | null,
    onPanZoomUpdate: () => void,
    onSelectResource: (resourceId: string) => void,
    getSvg: () => SVGSVGElement | null,
): () => void {
    type Mode = 'idle' | 'pending-click' | 'pending-pan' | 'panning'
    let mode: Mode = 'idle'
    let pointerId: number | null = null
    let startX = 0
    let startY = 0
    let lastX = 0
    let lastY = 0
    let pendingResourceId: string | null = null

    const onWheel = (event: WheelEvent) => {
        event.preventDefault()
        const state = getState()
        if (!state) {
            return
        }

        const rect = viewport.getBoundingClientRect()
        const cursorX = event.clientX - rect.left
        const cursorY = event.clientY - rect.top
        const factor = event.deltaY > 0 ? 0.9 : 1.1
        const nextZoom = clamp(state.zoom * factor, 0.25, 4)

        state.panX = cursorX - ((cursorX - state.panX) * nextZoom) / state.zoom
        state.panY = cursorY - ((cursorY - state.panY) * nextZoom) / state.zoom
        state.zoom = nextZoom
        onPanZoomUpdate()
    }

    const resolveResourceAt = (clientX: number, clientY: number): string | null => {
        return findResourceIdFromPointer(clientX, clientY, getSvg())
    }

    const onPointerDown = (event: PointerEvent) => {
        if (event.button !== 0) {
            return
        }
        pointerId = event.pointerId
        startX = event.clientX
        startY = event.clientY
        lastX = event.clientX
        lastY = event.clientY
        pendingResourceId = resolveResourceAt(event.clientX, event.clientY)
        mode = pendingResourceId ? 'pending-click' : 'pending-pan'
        // Do not capture yet — allow a clean click on nodes.
    }

    const onPointerMove = (event: PointerEvent) => {
        if (pointerId !== event.pointerId) {
            return
        }
        const dx = event.clientX - startX
        const dy = event.clientY - startY
        const distance = Math.hypot(dx, dy)

        if (mode === 'pending-click' || mode === 'pending-pan') {
            if (distance < 6) {
                return
            }
            // Drag started: cancel click and pan the canvas.
            mode = 'panning'
            pendingResourceId = null
            viewport.setPointerCapture(event.pointerId)
            viewport.style.cursor = 'grabbing'
        }

        if (mode !== 'panning') {
            return
        }

        const state = getState()
        if (!state) {
            return
        }
        state.panX += event.clientX - lastX
        state.panY += event.clientY - lastY
        lastX = event.clientX
        lastY = event.clientY
        onPanZoomUpdate()
    }

    const endPointer = (event: PointerEvent) => {
        if (pointerId !== event.pointerId) {
            return
        }

        if (mode === 'pending-click') {
            // Re-resolve on release in case layout shifted; prefer press target if still set.
            const resourceId = pendingResourceId
                ?? resolveResourceAt(event.clientX, event.clientY)
            if (resourceId) {
                onSelectResource(resourceId)
            }
        }

        if (mode === 'panning' && viewport.hasPointerCapture(event.pointerId)) {
            viewport.releasePointerCapture(event.pointerId)
        }

        mode = 'idle'
        pointerId = null
        pendingResourceId = null
        viewport.style.cursor = 'grab'
    }

    viewport.style.cursor = 'grab'
    viewport.style.touchAction = 'none'
    viewport.addEventListener('wheel', onWheel, { passive: false })
    viewport.addEventListener('pointerdown', onPointerDown)
    viewport.addEventListener('pointermove', onPointerMove)
    viewport.addEventListener('pointerup', endPointer)
    viewport.addEventListener('pointercancel', endPointer)

    return () => {
        viewport.style.cursor = ''
        viewport.style.touchAction = ''
        viewport.removeEventListener('wheel', onWheel)
        viewport.removeEventListener('pointerdown', onPointerDown)
        viewport.removeEventListener('pointermove', onPointerMove)
        viewport.removeEventListener('pointerup', endPointer)
        viewport.removeEventListener('pointercancel', endPointer)
    }
}

function parseSvgFromRenderResult(
    result: Awaited<ReturnType<typeof mermaid.render>>,
    container: HTMLDivElement,
): SVGSVGElement | null {
    container.innerHTML = result.svg
    result.bindFunctions?.(container)
    const svg = container.querySelector('svg')
    return svg instanceof SVGSVGElement ? svg : null
}

function readViewBox(svg: SVGSVGElement): { width: number, height: number } | null {
    const viewBox = svg.viewBox?.baseVal
    const width = viewBox?.width ?? Number.parseFloat(svg.getAttribute('width') ?? '0')
    const height = viewBox?.height ?? Number.parseFloat(svg.getAttribute('height') ?? '0')
    if (!width || !height) {
        return null
    }
    if (viewBox) {
        svg.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`)
    }
    return { width, height }
}

function applySvgPixelSize(
    svg: SVGSVGElement,
    vbWidth: number,
    vbHeight: number,
    totalScale: number,
): void {
    const width = Math.max(1, Math.floor(vbWidth * totalScale))
    const height = Math.max(1, Math.floor(vbHeight * totalScale))

    svg.style.display = 'block'
    svg.style.width = `${width}px`
    svg.style.height = `${height}px`
    svg.setAttribute('width', String(width))
    svg.setAttribute('height', String(height))
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
}

function centerCompactView(viewport: HTMLDivElement, state: CompactViewState): void {
    const width = state.vbWidth * state.baseScale * state.zoom
    const height = state.vbHeight * state.baseScale * state.zoom
    state.panX = (viewport.clientWidth - width) / 2
    state.panY = (viewport.clientHeight - height) / 2
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value))
}

function escapeHtml(input: string): string {
    return input
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll('\'', '&#039;')
}
