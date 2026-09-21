import React, { useCallback, useEffect, useRef, useState } from 'react'
import { styled } from '@mui/material/styles'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ResizableGridProps {
    cell11: React.ReactNode;
    cell12: React.ReactNode;
    cell21: React.ReactNode;
    cell22: React.ReactNode;
}

interface Sizes {
    colWidths: number[];
    rowHeights: number[][];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'resizable-grid-v3'
const COLS = 2
const ROWS = 2

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number) {
    return Math.max(min, Math.min(max, v))
}

function defaultSizes(): Sizes {
    return {
        colWidths: Array(COLS).fill(1 / COLS),
        rowHeights: Array(COLS)
            .fill(null)
            .map(() => Array(ROWS).fill(1 / ROWS)),
    }
}

function loadSizes(): Sizes {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return defaultSizes()
        const p = JSON.parse(raw) as Partial<Sizes>
        if (!p.colWidths || !p.rowHeights) return defaultSizes()
        return p as Sizes
    } catch {
        return defaultSizes()
    }
}

function saveSizes(s: Sizes) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
    } catch {
        // ignore
    }
}

// ─── Styled components ────────────────────────────────────────────────────────

const GridRoot = styled('div')`
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: row;
    overflow: hidden;
`

const ColStrip = styled('div')`
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 32px;
`

const Cell = styled('div')`
    flex-shrink: 0;
    min-height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;

`

const ColDivider = styled('div')`
    width: ${props => props.theme.spacing(0.5)};
    flex-shrink: 0;
    background: ${props => props.theme.palette.background.default};
    position: relative;
    cursor: ew-resize;
`

const RowDivider = styled('div')`
    height: ${props => props.theme.spacing(0.5)};
    flex-shrink: 0;
    background: ${props => props.theme.palette.background.default};
    position: relative;
    cursor: ns-resize;
`

// ─── Component ────────────────────────────────────────────────────────────────


/**
 * A resizable grid component that allows dynamic resizing of rows and columns
 * using draggable dividers. The grid is composed of cells provided via props.
 *
 * @param {Object} props The properties required to render the resizable grid.
 * @param {React.ReactNode} props.cell11 The React node to render in the top-left cell (1st column, 1st row).
 * @param {React.ReactNode} props.cell12 The React node to render in the bottom-left cell (1st column, 2nd row).
 * @param {React.ReactNode} props.cell21 The React node to render in the top-right cell (2nd column, 1st row).
 * @param {React.ReactNode} props.cell22 The React node to render in the bottom-right cell (2nd column, 2nd row).
 */
export function ResizableGrid({
                                  cell11,
                                  cell12,
                                  cell21,
                                  cell22,
                              }: ResizableGridProps) {
    // Map props to a 2D array indexed [colIdx][rowIdx]
    const cells: React.ReactNode[][] = [
        [cell11, cell12],
        [cell21, cell22],
    ]

    const [sizes, setSizes] = useState<Sizes>(loadSizes)
    const rootRef = useRef<HTMLDivElement>(null)

    // Track which divider is being dragged: { type, colIdx, rowIdx? }
    const dragRef = useRef<{
        type: 'col' | 'row';
        colIdx: number;
        rowIdx?: number;
    } | null>(null)

    // Force re-render on drag so isDragging props update
    const [, forceUpdate] = useState(0)

    useEffect(() => {
        saveSizes(sizes)
    }, [sizes])

    // ── Drag column divider ──────────────────────────────────────────────────

    const startColDrag = useCallback(
        (colIdx: number, e: React.MouseEvent) => {
            e.preventDefault()
            const totalW = rootRef.current!.clientWidth
            const startX = e.clientX
            const startWidths = [...sizes.colWidths]
            document.body.style.cursor = 'ew-resize'
            document.body.style.userSelect = 'none'
            dragRef.current = { type: 'col', colIdx }
            forceUpdate((n) => n + 1)

            const MIN = 32 / totalW

            const onMove = (ev: MouseEvent) => {
                const dx = (ev.clientX - startX) / totalW
                const w = [...startWidths]
                const avail = w[colIdx] + w[colIdx + 1]
                w[colIdx] = clamp(startWidths[colIdx] + dx, MIN, avail - MIN)
                w[colIdx + 1] = avail - w[colIdx]
                setSizes((s) => ({ ...s, colWidths: w }))
            }

            const onUp = () => {
                document.body.style.cursor = ''
                document.body.style.userSelect = ''
                dragRef.current = null
                forceUpdate((n) => n + 1)
                window.removeEventListener('mousemove', onMove)
                window.removeEventListener('mouseup', onUp)
            }

            window.addEventListener('mousemove', onMove)
            window.addEventListener('mouseup', onUp)
        },
        [sizes],
    )

    // ── Drag row divider ─────────────────────────────────────────────────────

    const startRowDrag = useCallback(
        (colIdx: number, rowIdx: number, e: React.MouseEvent) => {
            e.preventDefault()
            const totalH = rootRef.current!.clientHeight
            const startY = e.clientY
            const startHeights = [...sizes.rowHeights[colIdx]]
            document.body.style.cursor = 'ns-resize'
            document.body.style.userSelect = 'none'
            dragRef.current = { type: 'row', colIdx, rowIdx }
            forceUpdate((n) => n + 1)

            const MIN = 32 / totalH

            const onMove = (ev: MouseEvent) => {
                const dy = (ev.clientY - startY) / totalH
                const h = [...startHeights]
                const avail = h[rowIdx] + h[rowIdx + 1]
                h[rowIdx] = clamp(startHeights[rowIdx] + dy, MIN, avail - MIN)
                h[rowIdx + 1] = avail - h[rowIdx]
                const allH = sizes.rowHeights.map((rh, i) => (i === colIdx ? h : rh))
                setSizes((s) => ({ ...s, rowHeights: allH }))
            }

            const onUp = () => {
                document.body.style.cursor = ''
                document.body.style.userSelect = ''
                dragRef.current = null
                forceUpdate((n) => n + 1)
                window.removeEventListener('mousemove', onMove)
                window.removeEventListener('mouseup', onUp)
            }

            window.addEventListener('mousemove', onMove)
            window.addEventListener('mouseup', onUp)
        },
        [sizes],
    )

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <GridRoot ref={rootRef}>
            {sizes.colWidths.map((colW, colIdx) => (
                <React.Fragment key={colIdx}>
                    <ColStrip style={{ flex: `${colW} 1 0` }}>
                        {sizes.rowHeights[colIdx].map((rowH, rowIdx) => (
                            <React.Fragment key={rowIdx}>
                                <Cell style={{ flex: `${rowH} 1 0` }}>
                                    {cells[colIdx][rowIdx]}
                                </Cell>

                                {rowIdx < ROWS - 1 && (
                                    <RowDivider onMouseDown={(e) => startRowDrag(colIdx, rowIdx, e)} />
                                )}
                            </React.Fragment>
                        ))}
                    </ColStrip>

                    {colIdx < COLS - 1 && (
                        <ColDivider onMouseDown={(e) => startColDrag(colIdx, e)} />
                    )}
                </React.Fragment>
            ))}
        </GridRoot>
    )
}
