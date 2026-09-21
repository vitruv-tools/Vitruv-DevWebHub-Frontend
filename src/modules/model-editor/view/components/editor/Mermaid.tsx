import React, { useEffect, useId, useMemo, useRef } from 'react'
import mermaid from 'mermaid'
import svgPanZoom from 'svg-pan-zoom'
import { isNil } from '../../../../../common/utils/nil-utils.ts'
import type { StructuredResource } from '../../../types/structured-resource.ts'
import { ResourcesStructuredToMermaidConverter } from '../../../converter/resources-structured-to-mermaid-converter.ts'
import { useTheme } from '@mui/material'

type MermaidDiagramProps = {
    structuredResource: StructuredResource
}

type ViewState = {
    zoom: number
    pan: {
        x: number
        y: number
    }
}

/**
 * Editor Mermaid diagram with svg-pan-zoom. Unchanged from the original editor pipeline.
 */
export function Mermaid({ structuredResource }: MermaidDiagramProps) {
    const code = useMemo(
        () => new ResourcesStructuredToMermaidConverter().convert(structuredResource),
        [structuredResource],
    )

    const id = useId().replace(/:/g, '_')
    const containerRef = useRef<HTMLDivElement | null>(null)
    // @ts-ignore
    const panZoomRef = useRef<svgPanZoom.Instance | null>(null)
    const viewStateRef = useRef<ViewState | null>(null)

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
            if (isNil(code)) return

            const container = containerRef.current
            if (!container) return

            if (panZoomRef.current) {
                viewStateRef.current = {
                    zoom: panZoomRef.current.getZoom(),
                    pan: panZoomRef.current.getPan(),
                }
                panZoomRef.current.destroy()
                panZoomRef.current = null
            }

            container.innerHTML = ''

            try {
                const result = await mermaid.render(`mermaid_${id}`, code)
                if (cancelled) return

                container.innerHTML = result.svg
                result.bindFunctions?.(container)

                const svg = container.querySelector('svg')
                if (!(svg instanceof SVGSVGElement)) return

                applyNaturalSvgSize(svg)

                const instance = svgPanZoom(svg, {
                    zoomEnabled: true,
                    panEnabled: true,
                    controlIconsEnabled: true,
                    mouseWheelZoomEnabled: true,
                    dblClickZoomEnabled: true,
                    preventMouseEventsDefault: true,
                    minZoom: 0.25,
                    maxZoom: 8,
                    fit: true,
                    center: true,
                })

                panZoomRef.current = instance

                const savedViewState = viewStateRef.current
                if (savedViewState) {
                    instance.zoom(savedViewState.zoom)
                    instance.pan(savedViewState.pan)
                }
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : 'Unknown Mermaid render error'

                container.innerHTML = `<pre style='white-space:pre-wrap'>${escapeHtml(
                    code,
                )}\n\n⚠️ ${escapeHtml(message)}</pre>`
            }
        }

        render()

        return () => {
            cancelled = true

            if (panZoomRef.current) {
                viewStateRef.current = {
                    zoom: panZoomRef.current.getZoom(),
                    pan: panZoomRef.current.getPan(),
                }
                panZoomRef.current.destroy()
                panZoomRef.current = null
            }
        }
    }, [code, id, theme.palette.mode])

    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                position: 'relative',
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

function applyNaturalSvgSize(svg: SVGSVGElement): void {
    svg.style.display = 'block'
    svg.style.maxWidth = 'none'
    svg.style.flex = 'none'
    svg.style.width = '100%'
    svg.style.height = '100%'
}

function escapeHtml(input: string): string {
    return input
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll('\'', '&#039;')
}
