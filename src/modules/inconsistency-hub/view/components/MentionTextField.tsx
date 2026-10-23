import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type SyntheticEvent } from 'react'
import { Box, Chip, ClickAwayListener, List, ListItemButton, ListItemText, Paper, Popper, TextField } from '@mui/material'
import {
    applySuggestion,
    findActiveMention,
    suggestMentions,
    type MentionSuggestion,
} from '../../helpers/mentions.ts'

type Props = {
    value: string
    onChange: (value: string) => void
    /** Users and metamodels that can be tagged. */
    candidates: MentionSuggestion[]
    placeholder?: string
    disabled?: boolean
    minRows?: number
}

/**
 * A comment box that opens a list of users and metamodels as soon as `@` is typed.
 * Arrow keys move, Enter or Tab inserts, Escape closes. Tags stay plain text;
 * the server reads them when the comment is saved.
 */
export function MentionTextField({
    value,
    onChange,
    candidates,
    placeholder,
    disabled = false,
    minRows = 3,
}: Props) {
    const [caret, setCaret] = useState(0)
    const [highlight, setHighlight] = useState(0)
    const [dismissedStart, setDismissedStart] = useState<number | null>(null)
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
    const inputRef = useRef<HTMLTextAreaElement | null>(null)
    const pendingCaret = useRef<number | null>(null)

    const active = useMemo(() => findActiveMention(value, caret), [value, caret])
    const suggestions = useMemo(() => {
        if (!active || active.start === dismissedStart) {
            return []
        }
        return suggestMentions(active.query, candidates)
    }, [active, dismissedStart, candidates])
    const open = !disabled && suggestions.length > 0
    const selectedIndex = Math.min(highlight, Math.max(suggestions.length - 1, 0))

    useEffect(() => {
        const position = pendingCaret.current
        if (position !== null && inputRef.current) {
            pendingCaret.current = null
            inputRef.current.setSelectionRange(position, position)
        }
    }, [value])

    function trackCaret(event: SyntheticEvent<HTMLTextAreaElement>) {
        setCaret(event.currentTarget.selectionStart ?? 0)
    }

    function choose(suggestion: MentionSuggestion) {
        if (!active) {
            return
        }
        const next = applySuggestion(value, active, caret, suggestion.name)
        // The browser moves the caret to the end when the value is replaced,
        // so it is put back after the render (see the effect above).
        pendingCaret.current = next.caret
        setCaret(next.caret)
        setHighlight(0)
        onChange(next.text)
        inputRef.current?.focus()
    }

    function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (!open) {
            return
        }
        if (event.key === 'ArrowDown') {
            event.preventDefault()
            setHighlight((selectedIndex + 1) % suggestions.length)
        } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            setHighlight((selectedIndex - 1 + suggestions.length) % suggestions.length)
        } else if (event.key === 'Enter' || event.key === 'Tab') {
            event.preventDefault()
            choose(suggestions[selectedIndex])
        } else if (event.key === 'Escape') {
            event.preventDefault()
            setDismissedStart(active?.start ?? null)
        }
    }

    return (
        <Box ref={setAnchorEl} sx={{ width: '100%' }}>
            <TextField
                fullWidth
                multiline
                minRows={minRows}
                size='small'
                placeholder={placeholder}
                value={value}
                disabled={disabled}
                inputRef={inputRef}
                onChange={event => {
                    setHighlight(0)
                    setDismissedStart(null)
                    setCaret(event.target.selectionStart ?? event.target.value.length)
                    onChange(event.target.value)
                }}
                onKeyDown={handleKeyDown}
                slotProps={{
                    htmlInput: {
                        onSelect: trackCaret,
                        onClick: trackCaret,
                        'aria-autocomplete': 'list',
                        'aria-expanded': open,
                    },
                }}
            />
            <Popper
                open={open}
                anchorEl={anchorEl}
                placement='bottom-start'
                style={{ zIndex: 1400, width: anchorEl?.clientWidth, maxWidth: 360 }}
            >
                <ClickAwayListener onClickAway={() => setDismissedStart(active?.start ?? null)}>
                    <Paper elevation={6} sx={{ mt: 0.5, maxHeight: 280, overflowY: 'auto' }}>
                        <List dense disablePadding role='listbox' aria-label='Tag a user or metamodel'>
                            {suggestions.map((suggestion, index) => (
                                <ListItemButton
                                    key={`${suggestion.kind}:${suggestion.name}`}
                                    role='option'
                                    selected={index === selectedIndex}
                                    aria-selected={index === selectedIndex}
                                    // Keeps focus in the text box so the caret is not lost.
                                    onMouseDown={event => event.preventDefault()}
                                    onClick={() => choose(suggestion)}
                                >
                                    <ListItemText
                                        primary={`@${suggestion.name}`}
                                        secondary={
                                            suggestion.kind === 'METAMODEL'
                                                ? `${suggestion.label} · everyone who knows this`
                                                : suggestion.label
                                        }
                                        slotProps={{ primary: { sx: { fontWeight: 600 } } }}
                                    />
                                    {suggestion.kind === 'METAMODEL' && (
                                        <Chip size='small' variant='outlined' label='metamodel' sx={{ ml: 1 }} />
                                    )}
                                </ListItemButton>
                            ))}
                        </List>
                    </Paper>
                </ClickAwayListener>
            </Popper>
        </Box>
    )
}
