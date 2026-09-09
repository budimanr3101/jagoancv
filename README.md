# JagoanCV

Canonical public origin: https://jagoancv.pages.dev/

A dependency-free, local-first web application for creating ATS-readable CVs and preparing job applications.

## Production routes

- `/` — Indonesian public landing page.
- `/en/` — English public landing page.
- `/editor.html` — private CV and cover-letter workspace, marked `noindex,follow`.

The public landing pages have separate canonical URLs and reciprocal `hreflang` links. Only `/` and `/en/` are included in `sitemap.xml`.

## Product capabilities

- Guided CV and cover-letter creation in Indonesian and English.
- Transparent ATS-readiness checks with keyword coverage reported separately.
- Responsive editor, A4 preview, and check views for mobile and desktop.
- Text-based PDF export.
- Automatic local saving without an account.
- Local-first processing with no CV or job-description content sent to a backend.

## Privacy boundary

Normal application use performs no network request and has no backend. CV data and target-job text remain in `localStorage` under:

`cv-ats-generator:document:v1`

Users can clear local data from the application. Analytics and trackers are not included.

## Architecture

- `app/index.html` and `app/en/index.html` — localized public landing pages.
- `app/landing.css` and `app/landing.js` — shared, cacheable landing assets.
- `app/editor.html` — editor shell.
- `app/js/model.js` — schema, validation, normalization, empty/sample documents.
- `app/js/storage.js` — guarded localStorage repository.
- `app/js/store.js` — observable document state and autosave lifecycle.
- `app/js/editor.js` — guided form renderer.
- `app/js/preview.js` — semantic single-column CV renderer.
- `app/js/editor-main.js` — browser integration and responsive interaction flow.
- `scripts/build-release.mjs` — multi-entry import-graph release builder.

Editor, preview, checking, and export consume the same canonical document rather than maintaining duplicate state.

## Run locally

From this directory:

```sh
python3 -m http.server 4174 --bind 127.0.0.1 --directory app
```

Open:

- `http://127.0.0.1:4174/` for the Indonesian landing page.
- `http://127.0.0.1:4174/en/` for the English landing page.
- `http://127.0.0.1:4174/editor.html` for the editor.

## Validation

No installation is needed:

```sh
npm run check
npm run test:seo
npm run test:release
npm test
```

## Clean release

Build the deployment directory with:

```sh
npm run build:release
```

The command recreates `dist/` from the three HTML entry points and their transitive local dependencies, plus root discovery files. Deploy **`dist/` only**. Do not deploy the raw `app/` directory, because it also contains tests and editable source assets that are intentionally excluded from production.
