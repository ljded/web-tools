# GeoGebra Classic packaged app

Status: bundled static app assets present under `public/apps/geogebra/`.

Detected version:
- GeoGebra Web Application `5.4.925.3`
- Main local launcher: `index.html`
- Upstream app shell: `GeoGebra/HTML5/5.0/GeoGebra.html`
- Local deploy script: `GeoGebra/deployggb.js`
- Local codebase: `GeoGebra/HTML5/5.0/web3d/`

License:
- `GeoGebra/deployggb.js` declares the GeoGebra Non-Commercial License Agreement.
- User confirmed GeoGebra license allows non-commercial distribution.
- Keep upstream GeoGebra branding and any license/notice files intact.

Local launch behavior:
- The Web Tools iframe loads `/apps/geogebra/index.html`.
- `index.html` follows the official self-hosted bundle pattern: it includes `GeoGebra/deployggb.js`, calls `applet.setHTML5Codebase('GeoGebra/HTML5/5.0/web3d/')`, then injects the Classic applet.
- `index.html` registers `/apps/geogebra/sworker-locked.js` with scope `/apps/geogebra/` on HTTPS, following GeoGebra's service worker pattern but adapted to cache same-origin bundled assets.
- The bundled upstream `GeoGebra.html` remains available for reference, but the tool uses the documented embed API entrypoint.

Caveats:
- Upstream GeoGebra files still contain online URLs for login, materials, sharing, preview images, icons, or optional services.
- Offline mode should avoid `material_id`, login, sharing, and online worksheets.
- Validate core offline behavior manually: geometry construction, function graphing, algebra input, and any enabled CAS/3D features.

Offline validation checklist:
- Open `/apps/geogebra/index.html` once while online.
- Switch DevTools Network to Offline.
- Reload the same path and verify the Classic applet starts from local resources.
