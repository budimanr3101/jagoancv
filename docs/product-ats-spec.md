# CV ATS Generator — Product & ATS Specification

**Status:** Stage 1 baseline  
**Date:** 4 September 2026  
**Target users:** Indonesian job seekers who need a professional CV that is easy to complete, easy to tailor, and reliably readable as plain text by common applicant tracking systems (ATS).

## 1. Product goal

Build a local-first web CV generator that is:

1. **ATS-safe by construction** — the default output uses a linear, single-column reading order and selectable text.
2. **Easy for first-time users** — content is entered through a guided flow with examples, validation, and an always-available preview.
3. **Honest about ATS compatibility** — the product checks known parsing risks but never claims to guarantee an interview or universal compatibility with every ATS.
4. **Private by default** — CV content stays in the browser unless the user explicitly exports it.
5. **Useful for each application** — users can compare their CV with a job description and see missing relevant terms without automatic keyword stuffing.

### Primary success outcome

A first-time user can create, check, and export a complete ATS-readable CV without needing to understand document formatting or ATS terminology.

### Non-goals for the first release

- Accounts, cloud synchronization, or collaborative editing.
- Automatic submission to job portals.
- Fabricating experience, skills, metrics, or keywords with AI.
- Decorative infographic CVs, charts, skill bars, timelines, or multi-column ATS output.
- Claiming a universal numeric “ATS score” that represents all ATS vendors.

## 2. Reference audit: CVfy

Reference reviewed: [CVfy Indonesian CV creator](https://cvfy.xyz/id/create/).

### Observed feature map

| Area | CVfy behavior observed | Keep, adapt, or replace |
|---|---|---|
| Editing model | Accordion sections on the left with a live CV preview | **Adapt:** retain live preview, but use a guided stepper and visible completion state |
| Personal details | Job title, name, email, location, phone, summary, and profile image | **Adapt:** retain fields; disable profile images in ATS mode |
| Skills | Technical skills, soft skills, languages, and interests | **Adapt:** prioritize role-relevant skills; move interests to optional extras |
| Social links | LinkedIn, Twitter/X, GitHub, and website | **Adapt:** use a repeatable “Professional links” model with plain-text labels |
| Experience | Repeatable work entries | **Keep**, with reverse chronology, structured dates, and achievement bullets |
| Education | Repeatable education entries | **Keep**, with structured degree, institution, location, and dates |
| Projects | Repeatable projects | **Keep** as an optional section, especially for technical and early-career users |
| Layout | One-column and two-column choices; two-column was the visible default | **Replace:** ATS mode is always one column; visual variants may change typography only |
| Styling | Multiple theme colors | **Restrict:** use a restrained accent; essential meaning must never depend on color |
| Languages | Ten localized routes, including Indonesian and English | **Scope:** Indonesian and English for the first release |
| Data actions | Reset sample data, clear data, import JSON, and export JSON | **Keep**, with confirmations and schema validation |
| Export | Download CV as PDF | **Keep**, but verify selectable text and extracted reading order |

### What CVfy does well

- Immediate visual feedback through live preview.
- Useful local actions: sample/reset, clear, JSON import, and JSON export.
- Broad section coverage without requiring an account.
- Localization demonstrates that one content model can support multiple languages.
- The interface exposes PDF export directly from the builder.

### Friction and ATS risks to improve

1. **Two-column layout is visually prominent and was selected by default.** Columns can interleave text during extraction, so the new product will not offer multi-column output in ATS mode.
2. **A profile image is offered as a normal personal-data field.** Images add no parseable candidate data and can introduce bias; ATS mode will omit them entirely.
3. **Formatting choices appear before the user completes core content.** This creates decision overhead. The new flow will be content-first and postpone typography until the CV is complete.
4. **Accordion sections hide overall progress.** A user can lose track of missing sections. The replacement will show steps, completion status, and actionable warnings.
5. **No visible ATS explanation or parseability check was observed.** The new product will explain each warning in plain language and distinguish blocking errors from recommendations.
6. **Social media and interests receive similar prominence to work history.** The new information architecture prioritizes contact, summary, experience, education, and job-relevant skills.
7. **PDF export alone does not prove parseability.** Verification must extract the generated PDF text and compare it with the intended linear order.
8. **No job-description comparison was observed.** The new product will offer local keyword comparison while warning users to include only truthful skills and experience.

## 3. Product principles

### 3.1 Content before decoration

The editor asks for employment-relevant information first. Font and accent choices are secondary and cannot alter the document’s semantic or reading order.

### 3.2 ATS-safe by construction

Unsafe structures are not merely warned about; they are excluded from ATS templates. Users cannot accidentally create columns, text boxes, image-based names, icon-only contact details, charts, or skill bars.

### 3.3 Guidance at the point of need

Examples and recommendations appear beside the relevant field. The product avoids a large instruction manual before the user can start.

### 3.4 Progressive disclosure

Required sections are visible first. Optional sections such as projects, certifications, awards, volunteer work, and languages can be enabled when relevant.

### 3.5 Private and reversible

Autosave remains local. Clear/reset actions require confirmation. Import validates the schema before replacing current data, and export creates a portable backup.

### 3.6 Human-readable and machine-readable

Every decision must satisfy both audiences: simple enough for parser extraction and polished enough for a recruiter to scan quickly.

## 4. Proposed information architecture

### Desktop

- **Header:** product name, language, save status, data menu, and export action.
- **Left workspace:** guided editor with numbered steps and completion markers.
- **Right workspace:** sticky A4 preview with page count and zoom controls.
- **Check panel:** grouped “Fix first”, “Recommended”, and “Tailor to job” findings.

### Mobile

Use three explicit views instead of squeezing editor and A4 preview side by side:

1. **Isi CV** — the active form step.
2. **Preview** — fit-to-width document preview.
3. **Pemeriksaan** — completion, ATS risks, and job-match findings.

The current step, local save state, and export action remain discoverable without a horizontal desktop layout.

### Guided content order

1. Personal details
2. Professional summary
3. Work experience
4. Education
5. Skills
6. Optional sections
7. Target job and ATS check
8. Export

## 5. Canonical CV data sections

### Required for a complete CV

- `basics`: full name, target/current role, email, phone, location, and professional links.
- `summary`: concise professional profile tailored to the target role.
- `experience[]`: role, organization, location, start/end dates, current-role flag, and achievement bullets.
- `education[]`: qualification, field, institution, location, and dates.
- `skills[]`: grouped, role-relevant hard skills.

### Optional

- `projects[]`
- `certifications[]`
- `languages[]`
- `awards[]`
- `volunteering[]`

### Explicitly excluded from ATS output

- Profile photo.
- Decorative icons as substitutes for text.
- Skill proficiency bars or charts.
- Personal attributes unrelated to employment, unless legally or regionally required by a specific application.
- Hidden keyword blocks or white-on-white text.

## 6. ATS-safe output contract

These rules apply to every template labeled **ATS-safe**.

### 6.1 Hard structural constraints

1. **One content column only.** No CSS grid/table layout may determine document reading order.
2. **Linear semantic DOM.** The preview and export follow the same top-to-bottom sequence.
3. **Real text only.** Candidate name, contact data, headings, dates, employers, qualifications, skills, and bullets may not be embedded as images or canvas pixels.
4. **No tables or text boxes.** Layout uses ordinary block flow.
5. **No essential headers or footers.** Contact information lives in the document body; the export does not depend on repeating page headers.
6. **No icon-only information.** Email, phone, LinkedIn, portfolio, and location have visible text labels or recognizable plain values.
7. **Standard headings.** Heading labels come from a controlled dictionary rather than arbitrary user text.
8. **Standard bullets.** Use a normal bullet character or hyphen, not custom SVG symbols.
9. **Consistent dates.** Display month and year consistently, with a clear “Present/Sekarang” value.
10. **Reverse chronology.** Current or most recent experience and education appear first by default.

### 6.2 Controlled section headings

| Meaning | English output | Indonesian output |
|---|---|---|
| Summary | Professional Summary | Ringkasan Profesional |
| Experience | Work Experience | Pengalaman Kerja |
| Education | Education | Pendidikan |
| Skills | Skills | Keterampilan |
| Projects | Projects | Proyek |
| Certifications | Certifications | Sertifikasi |
| Languages | Languages | Bahasa |
| Awards | Awards | Penghargaan |
| Volunteer work | Volunteer Experience | Pengalaman Relawan |

English headings are recommended when the target vacancy and submission portal are in English. The selected CV language controls headings, date labels, examples, and checking rules together.

### 6.3 Typography and page setup

- Use one web-safe/system font family per document: Arial/Helvetica-compatible sans serif or Georgia/Times-compatible serif.
- Body text target: **10–12 pt**.
- Section heading target: **14–16 pt**.
- Name target: **18–24 pt**, without unusual character spacing.
- Page margins: **0.5–1 inch** equivalent, with **0.7–0.8 inch** as the default.
- Maintain readable line spacing and whitespace; do not compress text solely to force one page.
- One or two pages are both valid. Page count is a content recommendation, not an ATS pass/fail rule.
- Color contrast must remain readable in grayscale and on common office printers.

### 6.4 Export requirements

- Export as a **text-based PDF**, never a screenshot or scanned image.
- Text selection and copy/paste must preserve the intended top-to-bottom order.
- Hyperlinks remain clickable, but their visible labels must also be understandable as text.
- Use a professional default filename such as `First-Last-Target-Role-CV.pdf`.
- Show an honest note: follow the employer’s requested format first. Some systems or vacancies prefer DOCX.
- DOCX export is a post-MVP candidate unless it can be implemented without sacrificing correctness.

## 7. Content quality guidance

The checker will separate machine-readability from writing quality.

### Recommendations, not hard ATS failures

- Keep the professional summary concise and role-specific.
- Use 3–6 outcome-focused bullets for recent roles when evidence supports them.
- Start bullets with clear action verbs and describe impact, scale, speed, quality, cost, risk, or reliability where truthful.
- Prefer recognized job titles; explain an unusual internal title with a standard equivalent when accurate.
- Expand an important acronym once, then include the common abbreviation, for example “Amazon Web Services (AWS)”.
- Include keywords that genuinely reflect the user’s experience; never encourage copying unsupported requirements.
- Check spelling and date consistency.
- Avoid first-person pronouns and vague claims when a concrete example is available.

## 8. ATS checker rule model

The interface must not present one opaque score as a universal ATS verdict. It will display transparent findings with severity and a direct fix.

| Rule ID | Severity | Check | User-facing action |
|---|---|---|---|
| ATS-001 | Error | Full name missing | Add the name recruiters should see |
| ATS-002 | Error | Email or phone missing/invalid | Add at least one valid contact method; both are recommended |
| ATS-003 | Error | Export contains non-selectable essential text | Rebuild export as real text before download |
| ATS-004 | Error | Extracted PDF order differs from preview order | Block release of the affected template |
| ATS-005 | Error | Essential content appears in a table, column, image, header, or footer | Move it into linear document flow |
| ATS-006 | Warning | No work experience and no project/volunteer substitute | Add the most relevant evidence of work or capability |
| ATS-007 | Warning | Date range is incomplete or inconsistent | Complete or normalize the dates |
| ATS-008 | Warning | Nonstandard/custom section heading | Use the controlled heading for the selected language |
| ATS-009 | Warning | Summary is empty or excessively long | Add a concise, role-focused summary |
| ATS-010 | Recommendation | Bullet describes a duty without evidence of outcome | Add truthful impact or scope where available |
| ATS-011 | Recommendation | Skill is not supported elsewhere in the CV | Add evidence or remove the unsupported skill |
| ATS-012 | Recommendation | Relevant job-description term is absent | Review the term and add it only if truthful |
| ATS-013 | Recommendation | Important acronym appears without its expanded form | Include both forms once |
| ATS-014 | Recommendation | Filename is generic | Use name and target role in the filename |
| ATS-015 | Information | Employer requests a particular file type | Follow the vacancy instruction over the tool default |

Completion and ATS readiness are separate:

- **Completion** answers: “Have you supplied the information needed for a useful CV?”
- **ATS readiness** answers: “Can the exported structure and text be parsed reliably?”
- **Job alignment** answers: “Does the truthful content use relevant terminology from this vacancy?”

## 9. Job-description comparison contract

The first release performs deterministic, local analysis:

1. Normalize case, punctuation, and common singular/plural forms.
2. Remove common stop words while preserving technical phrases.
3. Detect recurring one-to-three-word terms in the vacancy.
4. Compare those terms with visible CV text.
5. Group results into “already present”, “review”, and “not relevant/dismissed”.
6. Let users dismiss irrelevant terms so warnings remain useful.
7. Never insert terms automatically or conceal keywords from human readers.
8. Never send the vacancy or CV to a third-party API.

The UI must call this **keyword coverage** or **job alignment**, not a guarantee of ATS ranking.

## 10. MVP feature baseline

### Must have

- Indonesian and English UI/output.
- Guided editor with visible progress.
- Local autosave and clear save-state feedback.
- Sample data, clear data, JSON backup, and validated JSON restore.
- Repeatable experience, education, projects, certifications, languages, and links.
- Reordering for entries and optional sections without breaking linear reading order.
- Live A4 preview with page boundaries.
- At least two visually distinct but structurally identical ATS-safe typography themes.
- Transparent ATS findings grouped by severity.
- Local job-description keyword comparison.
- Text-based PDF export with a professional filename.
- Responsive mobile edit, preview, and check views.
- Keyboard-accessible controls and visible focus states.

### Later candidates

- DOCX export.
- Multiple saved CV variants per target role.
- Optional local AI assistance or user-configured AI provider.
- Cloud accounts and synchronization.
- Cover-letter generation.
- Non-ATS creative templates clearly separated from ATS mode.

## 11. Acceptance criteria for later stages

### Functional

- A new user can complete all required sections without creating an account.
- Autosave survives a refresh and reports success/failure visibly.
- JSON export/import round-trips without losing IDs, ordering, visibility, or dates.
- Invalid or incompatible JSON never silently replaces current work.
- All repeatable entries support add, edit, reorder, duplicate, and remove.
- Clearing data requires confirmation and offers sample data as a reversible starting point.

### ATS and export

- The ATS template DOM contains no layout tables, canvases, essential images, or multi-column containers.
- Generated PDF text can be extracted with a standard PDF text extractor.
- Extracted headings, contact data, role, employer, dates, and bullets appear in expected order.
- Copying all PDF text produces usable plain text without duplicated or interleaved content.
- Essential content does not rely on page headers or footers.
- A two-page CV has intentional page breaks and does not split a heading from its first entry.
- Export works with Indonesian characters and common Latin diacritics.

### Usability and accessibility

- On mobile, editor, preview, and checks are each usable without horizontal scrolling.
- A first-time user can find where to begin, see what remains, preview the result, and export without prior instructions.
- Labels and validation messages use plain language and identify how to fix the issue.
- Every form control has an accessible name and all primary actions work by keyboard.
- Destructive actions are clearly distinguished and confirmed.

### Privacy

- CV content and job descriptions are not transmitted during normal use.
- The UI states where data is stored and how to delete it.
- No analytics event may contain CV field values or job-description text.

## 12. Design constraints for Stage 2

Stage 2 may explore different navigation and visual hierarchy, but every option must preserve:

- Content-first guided flow.
- Single-column ATS document output.
- Visible save state and progress.
- Clear separation of editing, preview, and checks.
- No decorative card overload, excessive pills, or generic gradient-heavy styling.
- A restrained, professional visual language appropriate for job applications.
- Mobile usability as a first-class layout, not a scaled-down desktop afterthought.

## 13. Evidence base

- [CVfy Indonesian CV creator](https://cvfy.xyz/id/create/) — reference feature and interaction audit.
- [Workable: What is resume parsing and how an ATS reads a resume](https://resources.workable.com/stories-and-insights/how-ATS-reads-resumes) — first-party ATS vendor explanation that parsing depends on text extraction and recommends standard formatting, typical headings, one standard font, chronological structure, and avoiding tables, columns, headers, footers, and scanned PDFs.
- [Jobscan: Anatomy of an ATS Friendly Resume Format](https://www.jobscan.co/blog/20-ats-friendly-resume-templates/) — corroborating guidance for single-column documents, standard headings, web-safe fonts, normal bullets, common font sizes, margins, and text-based PDF/DOCX output.

## 14. Stage 1 decision summary

1. **ATS mode will have one column only.**
2. **Profile photos and decorative information graphics are excluded from ATS output.**
3. **The application will be local-first and require no account for the MVP.**
4. **The editor will be guided and content-first, with preview and checks always discoverable.**
5. **The product will show transparent findings rather than an unexplained universal score.**
6. **Job-description comparison will run locally and never auto-insert unsupported keywords.**
7. **PDF release is gated by selectable-text and reading-order verification.**
8. **Indonesian and English are the initial supported languages.**
