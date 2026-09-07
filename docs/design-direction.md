# CV ATS Generator — Design Direction

**Stage:** 2 — Mockup dan Arah Desain  
**Mockup gallery:** `../sketches/index.html`  
**Decision:** **A · Langkah Terpandu** is the implementation specification.

## Compared directions

| Dimension | A · Langkah Terpandu | B · Split Workbench | C · Document First |
|---|---|---|---|
| Core model | Numbered steps, focused form, persistent preview | Compact navigator, dense editor, preview/check inspector | A4 document is primary; click a section to edit |
| New-user ease | **Very high** | Medium | High after discovery |
| Discoverability | **Very high** | High but visually dense | Medium; editable areas must be discovered |
| Desktop efficiency | High | **Very high** | High |
| Mobile suitability | **Very high** | Medium | Medium-high |
| ATS clarity | **Very high** | Very high | High |
| Accessibility risk | Low | Medium | High due to document click targets and contextual state |
| Implementation risk | **Low** | Medium | High |
| Best fit | First-time and occasional CV creators | Returning power users | Visually confident users who expect direct manipulation |

## Why A wins

The product goal prioritizes **easy use without ATS knowledge**. A makes the next action explicit, shows overall progress, keeps guidance beside the relevant field, and preserves a nearby document preview. It also translates cleanly to a narrow screen without reproducing a three-panel desktop workspace.

B is efficient but asks users to understand a denser tool. C creates the strongest relationship between content and output, but discoverability, keyboard behavior, validation focus, and mobile editing are harder to make reliable.

## Ideas retained from the other directions

From **B · Split Workbench**:

- Separate **Preview** and **Pemeriksaan** views.
- Compact status counts for warnings and keyword coverage.
- Faster navigation for returning users after the guided flow is complete.

From **C · Document First**:

- Clearly highlight the preview section related to the active form step.
- Keep form labels and preview headings synchronized.
- Make the relationship between an edit and its output immediately visible, without editing inside the document itself.

## Locked desktop structure

1. **Header**
   - Product name.
   - Local save status.
   - Data menu.
   - `Periksa CV` secondary action.
   - `Ekspor PDF` primary action.
2. **Step navigation — 190–220 px**
   - Numbered required and optional sections.
   - Completion marker per section.
   - Overall completion percentage.
3. **Focused editor — flexible, minimum 360 px**
   - One section at a time.
   - Plain-language purpose and realistic example.
   - Fields, inline validation, and previous/next actions.
4. **Preview — approximately 400–460 px**
   - A4 document representation.
   - Page count and zoom control.
   - Optional quick-check summary above the page.

The editor is the primary surface. Preview is supportive and must never make the form too narrow.

## Locked mobile structure

Use three top-level views:

- **Isi CV** — active step and form.
- **Preview** — fit-to-width A4 document.
- **Pemeriksaan** — completion, ATS structure findings, and job alignment.

The header retains save state and the export action. Step navigation opens as a dedicated section list rather than a permanently visible sidebar. No horizontal scrolling is required.

## Interaction contract

- Selecting a step changes only the editor content and related preview highlight.
- `Simpan dan lanjut` validates the current step, saves locally, and advances.
- Users may navigate backward or to any completed step without losing changes.
- Required errors block advancing and explain the fix beside the field.
- Recommendations do not block advancing or export.
- `Periksa CV` opens a clear results view grouped into `Perbaiki dulu`, `Disarankan`, and `Sesuai lowongan`.
- Preview uses the same semantic data and order as PDF export.
- Destructive actions always require confirmation.

## Visual direction

- **Tone:** professional, calm, content-first, and trustworthy.
- **Typography:** system sans serif for the application; selected ATS-safe font for the document preview.
- **Application background:** neutral cool gray.
- **Editor and navigation:** white or near-white surfaces with thin neutral borders.
- **Primary accent:** restrained ink blue.
- **Success:** muted green; **warning:** amber; **error:** muted red.
- **Corners:** modest 6–10 px radius on application controls; the CV document remains square.
- **Elevation:** one restrained shadow for the A4 sheet; avoid stacked floating cards.
- **Icons:** optional, always accompanied by text; never use emoji or icon-only meaning.
- **Motion:** short state transitions only; no decorative movement.

## Content language

- Use direct Indonesian labels: `Isi CV`, `Preview`, `Pemeriksaan`, `Simpan dan lanjut`, `Periksa CV`, and `Ekspor PDF`.
- Explain ATS findings as actions, not technical parser jargon.
- Show realistic examples relevant to the field being edited.
- Never promise that a score guarantees passing an ATS or getting an interview.

## Implementation acceptance criteria

- The implementation matches A’s layout hierarchy and interaction model.
- Desktop retains visible step navigation, focused editor, and preview at 1180 px or wider.
- Mobile exposes the three explicit views and requires no horizontal scrolling.
- Keyboard users can reach steps, fields, checks, preview controls, and export in a logical order.
- Focus is visible and is moved intentionally after a step change or validation failure.
- ATS output remains one-column regardless of application layout.
- Preview and exported content share one data source and section order.
- Status is communicated by text as well as color.
- No profile photo, infographic, skill bar, decorative gradient, or multi-column CV output appears in ATS mode.

## Stage 2 decision record

The implementation will follow **A · Langkah Terpandu**, enriched with B’s dedicated check mode and C’s active-section preview relationship. The decision is locked for Stages 3–7 unless the user explicitly asks to revisit it.
