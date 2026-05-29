# Diagrams.net packaged app

Status: bundled static app assets present under `public/apps/diagrams/`.

Source:
- Official repository: https://github.com/jgraph/drawio
- Expected artifact type: GitHub release `draw.war`
- License: Apache-2.0 for diagrams.net/draw.io project assets, with additional third-party notices/licenses in subdirectories.

Detected contents:
- `index.html`
- `js/`
- `styles/`
- `images/`
- `resources/`
- `stencils/`
- `shapes/`
- `META-INF/`
- `WEB-INF/`

Local launch path:
- `/apps/diagrams/index.html?mode=device&enableSW=1&lang=<current-locale>`

Notes:
- The iframe wrapper launches Diagrams.net in device mode, passes the current Web Tools locale, and enables the bundled service worker with `enableSW=1`.
- Diagrams.net ships its own `service-worker.js`; the app registers it as `service-worker.js`, so it scopes to `/apps/diagrams/` when loaded from this path.
- Some upstream files still contain optional URLs for export, cloud storage, help, logging, collaboration, and integrations. These should not be treated as offline-capable features.
- If the exact GitHub release tag is important, record the tag used to download `draw.war` here; the unpacked artifact did not expose a clear release tag in the files inspected.

Offline validation checklist:
- Open `/apps/diagrams/index.html?mode=device` once while online.
- Switch DevTools Network to Offline.
- Reload the app path and verify diagram creation/editing and local device save/download.
