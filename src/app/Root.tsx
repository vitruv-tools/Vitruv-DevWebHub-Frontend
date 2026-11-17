import { createTheme, ThemeProvider, useMediaQuery } from '@mui/material'
import { App } from './App.tsx'

export function Root() {
    const lightTheme = createTheme({
        palette: {
            mode: 'light',
            background: {
                default: '#f6f6f8',
            },
        },
    })

    const darkTheme = createTheme({
        palette: {
            mode: 'dark',
            background: {
                default: '#242424',
            },
        },
    })

    const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)')

    const theme = prefersDarkMode ? darkTheme : lightTheme

    return (
        <ThemeProvider theme={theme}>
            <App />
        </ThemeProvider>
    )
}
