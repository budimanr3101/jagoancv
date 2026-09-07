# SiapLamar

A dependency-free, local-first web application for creating ATS-readable CVs and preparing job applications.

## Current implementation (Stage 4)

The application now provides:

- Versioned CV schema (`schemaVersion: 1`) with empty and realistic sample documents.
- Canonical sections for profile, summary, experience, education, projects, certifications, skills, languages, awards, volunteering, and professional links.
- Guarded browser persistence with explicit quota, access, and corrupt-data errors.
- Debounced autosave with visible pending, saved, and error states.
- Confirmed sample-data and clear-data operations.
- Guided step editor with plain-language examples and inline validation.
- Add, edit, duplicate, reorder, and remove operations for every repeatable collection.
- Measurable-achievement guidance for experience and project bullets.
- Responsive, semantic, single-column A4 live preview.
- Completion progress and a preliminary required-field check panel.
- Dedicated edit, preview, and check views on narrower screens.

The detailed ATS checker and job-description comparison belong to Stage 5. PDF export and final export UX belong to Stage 6.

## Privacy boundary

Normal application use performs no network request and has no backend. CV data and target-job text remain in `localStorage` under:

`cv-ats-generator:document:v1`

Users can clear local data from the application. Analytics must never contain CV field values.

## Architecture

- `app/js/model.js` — schema, validation, normalization, empty/sample documents.
- `app/js/storage.js` — guarded localStorage repository.
- `app/js/store.js` — observable document state and autosave lifecycle.
- `app/js/entry-actions.js` — immutable repeatable-entry operations.
- `app/js/completeness.js` — completion, validation, and bullet guidance.
- `app/js/editor.js` — guided form renderer.
- `app/js/preview.js` — semantic single-column CV renderer.
- `app/js/editor-main.js` — browser integration and responsive interaction flow.

Editor, preview, checking, and export consume the same canonical document rather than maintaining duplicate state.

## Run locally

From this directory:

```sh
python3 -m http.server 4174 --bind 127.0.0.1 --directory app
```

Then open `http://127.0.0.1:4174/`.

## Lightweight validation

No installation is needed:

```sh
npm run check
npm test
```
