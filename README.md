# Vitruvius Web Frontend

This Web Frontend provides an editor for editing VSUMs. It uses the new VitruviusServer as backend.


## Run

- Setup: `npm install`
- Run for development
    - Ensure that the backend is running
    - `npm run dev -- --host 0.0.0.0 --port 5173`
    - `npm run test:run`
- Build for production
    - Set proper environment variables (see `/.env` and `/src/base.ts`)
    - `npm run build`

## Environment (`.env`)

| Variable | Purpose |
|----------|---------|
| `VITE_VITRUVIUS_SERVER_BASE_URL` | VitruviusServer API base. Use `auto` to follow the UI host (`localhost` or LAN IP on port 8000). |
| `VITE_AUTH_API_BASE_URL` | Methodologist auth API (default `http://localhost:9811`). |
| `VITE_ALLOW_MULTIPLE_SELECTED_OBJECTS` | Allow multi-select when opening a view. |

## Authentication

- App starts on **Sign in**. Editor and Hub need a session.
- **Sign up** uses the Methodologist auth API when it is running (`POST /api/v1/users/sign-up`).
- If that auth server is offline, sign-up falls back to a local user store (fine for local demos).
- Demo account: `demo` / `demo`
- For a second user (e.g. Hub comments): sign up once, e.g. `tejas` / `Tejas@123!`
- After login: **HUB** in the editor toolbar opens the Inconsistency Hub; **Sign out** is in the top bar
- Demo steps: [`../VitruviusServer/HUB-E2E-DEMO.md`](../VitruviusServer/HUB-E2E-DEMO.md)

## Functionality

- Create, edit, delete and list VSUMs
- Open and close a view for a VSUM
- Edit the view and update the VSUM (async propagation + interaction dialogs)
- Inconsistency Hub: parked dialogs from dismiss (**X**), comments, resolve with **+ choice**
- Hub **Visualization** tab:
  - Compact three-column layout (model overview | Mermaid diagram | correspondences)
  - **Red** = inconsistency root (always); **blue** = selection after click
  - Correspondences panel: selected element + linked partners (clickable); uses live context when present, otherwise snapshot inference (`snapshot-correspondences.ts`)
  - **+ choice** available on the Commits / Visualization tab bar for OPEN items
- After **+ choice**, an optional resolution comment is recorded and shown in the description (resolver, choice, comment, date/time)

## Hub visualization helpers (key files)

| File | Role |
|------|------|
| `src/modules/inconsistency-hub/helpers/snapshot-correspondences.ts` | Infer System↔Root, Entity↔Component/Server/Device, Link↔Link when live edges are empty |
| `src/modules/inconsistency-hub/helpers/inconsistency-highlight-helpers.ts` | Resolve red highlight root(s) from the parked message + snapshot |
| `src/modules/inconsistency-hub/helpers/mermaid-highlight-overlays.ts` | Draw red/blue rings on Mermaid nodes |
| `src/modules/inconsistency-hub/view/components/tabs/CorrespondencePanel.tsx` | Correspondences side panel |
| `src/modules/inconsistency-hub/view/components/tabs/FilesChangedTab.tsx` | Visualization tab wiring |
| `src/modules/inconsistency-hub/view/components/tabs/HubMermaidDiagram.tsx` | Diagram pan/zoom + click selection |
