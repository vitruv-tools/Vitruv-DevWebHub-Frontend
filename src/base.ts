import { stringAsBoolean } from './common/utils/string-utils.ts'

// ------------------------------------------------------------------------------------------
// These constants are loaded from the environment variables
// Edit /.env to change them
// See https://vite.dev/guide/env-and-mode for details, especially for production usage
// ------------------------------------------------------------------------------------------

function resolveVitruviusServerBaseUrl(): string {
    const configured = import.meta.env.VITE_VITRUVIUS_SERVER_BASE_URL as string | undefined
    if (configured && configured !== 'auto') {
        return configured
    }

    if (typeof window !== 'undefined') {
        return `${window.location.protocol}//${window.location.hostname}:8000/api`
    }

    return 'http://localhost:8000/api'
}

/**
 * Base URL for the VitruviusServer.
 * Use VITE_VITRUVIUS_SERVER_BASE_URL=auto to follow the UI host (localhost or LAN IP).
 */
export const VITRUVIUS_SERVER_BASE_URL = resolveVitruviusServerBaseUrl()

/**
 * Base URL for Methodologist auth API (login / refresh). No `/api` suffix.
 * Example: http://localhost:9811
 */
export const AUTH_API_BASE_URL =
    import.meta.env.VITE_AUTH_API_BASE_URL ?? 'http://localhost:9811'

/**
 * Specifies if multiple selectable objects can be selected when opening a view
 */
export const ALLOW_MULTIPLE_SELECTED_OBJECTS = stringAsBoolean(
    import.meta.env.VITE_ALLOW_MULTIPLE_SELECTED_OBJECTS,
)
