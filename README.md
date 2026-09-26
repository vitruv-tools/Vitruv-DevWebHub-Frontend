# Vitruvius Web Frontend

React/TypeScript client for `VitruviusServer`.

## Prerequisites

- Node.js 20+ / npm
- Backend running (see [GitHubProject](https://github.com/vitruv-tools/Vitruv-DevWebHub-Backend))

## Run

```bash
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

UI: http://localhost:5173

## Tests

```bash
npm install
npm run test:run
npm run build
```

## Environment (`.env`)

| Variable | Purpose |
|----------|---------|
| `VITE_VITRUVIUS_SERVER_BASE_URL` | Server API (`auto` = same host, port 8000) |
| `VITE_AUTH_API_BASE_URL` | Methodologist auth (default `http://localhost:9811`) |
| `VITE_ALLOW_MULTIPLE_SELECTED_OBJECTS` | Multi-select when opening a view |

## Auth

- Sign in required for editor and Hub
- Demo: `demo` / `demo`
- Sign up uses Methodologist auth when available; otherwise local browser fallback

## Features

- Create / open / edit / update VSUMs (async propagation + dialogs)
- Inconsistency Hub: park with **X**, comments, resolve with **+ choice**
- Visualization: snapshot, red inconsistency highlight, blue selection, correspondences
- Optional resolution comment after answering
