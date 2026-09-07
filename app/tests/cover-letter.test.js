import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  CVValidationError,
  SCHEMA_VERSION,
  createEmptyCV,
  createEmptyCoverLetter,
  createSampleCV,
  hasCoverLetterContent,
  isCVEmpty,
  normalizeCV,
  validateCV,
} from "../js/model.js";
import { COVER_LETTER_FIELDS, paragraphsToText, renderCoverLetterEditor } from "../js/cover-letter.js";
import { formatLetterDate, renderCVDocument, renderCoverLetterDocument } from "../js/preview.js";
import { exportTextPDF, pdfFilename } from "../js/pdf-export.js";
import { LETTER_LENGTH, coverLetterStats, runCoverLetterChecks } from "../js/letter-checks.js";
import { coverLetterToPlainText, matchJobDescription } from "../js/keyword-match.js";
import { renderATSCheckPanel, renderLetterCheckPanel } from "../js/checker-view.js";

function deterministicOptions() {
  let sequence = 0;
  return {
    idFactory: (prefix) => `${prefix}-${++sequence}`,
    now: () => new Date("2026-09-07T03:00:00.000Z"),
  };
}

test("empty document carries an empty cover letter with conventional Indonesian defaults", () => {
  const cv = createEmptyCV(deterministicOptions());
  assert.deepEqual(cv.coverLetter, createEmptyCoverLetter());
  assert.equal(cv.coverLetter.greeting, "Dengan hormat,");
  assert.equal(cv.coverLetter.closing, "Hormat saya,");
  assert.deepEqual(cv.coverLetter.paragraphs, []);
  assert.equal(isCVEmpty(cv), true, "conventional greeting alone must not make a document non-empty");
});

test("documents saved before this feature still load and gain cover-letter defaults", () => {
  const legacy = createEmptyCV(deterministicOptions());
  delete legacy.coverLetter;
  assert.deepEqual(validateCV(legacy), [], "a document without coverLetter stays valid");

  const normalized = normalizeCV(legacy);
  assert.equal(normalized.schemaVersion, SCHEMA_VERSION, "schema version must not be bumped");
  assert.deepEqual(normalized.coverLetter, createEmptyCoverLetter());
});

test("a malformed cover letter is rejected before it reaches the document", () => {
  const cv = createEmptyCV(deterministicOptions());
  cv.coverLetter = "bukan object";
  assert.ok(validateCV(cv).includes("coverLetter tidak valid"));
  assert.throws(() => normalizeCV(cv), CVValidationError);
});

test("normalization sanitizes paragraphs and preserves a deliberately emptied greeting", () => {
  const cv = createEmptyCV(deterministicOptions());
  cv.coverLetter = {
    recipient: "Bapak/Ibu HRD",
    recipientTitle: 42,
    city: "Bekasi",
    date: "2026-09-07",
    greeting: "",
    paragraphs: ["Paragraf pertama.", 7, null, "Paragraf kedua."],
    closing: "Hormat saya,",
  };
  const normalized = normalizeCV(cv);
  assert.equal(normalized.coverLetter.recipientTitle, "", "non-text values become empty strings");
  assert.equal(normalized.coverLetter.greeting, "", "an emptied greeting is not silently refilled");
  assert.deepEqual(normalized.coverLetter.paragraphs, ["Paragraf pertama.", "Paragraf kedua."]);
});

test("sample document ships a usable cover letter aligned with the target job", () => {
  const cv = createSampleCV(deterministicOptions());
  assert.equal(cv.targetJob.title, "Senior Cloud Engineer");
  assert.equal(cv.coverLetter.recipient, "Bapak/Ibu Tim Rekrutmen");
  assert.equal(cv.coverLetter.city, "Jakarta");
  assert.equal(cv.coverLetter.paragraphs.length, 3);
  assert.match(cv.coverLetter.paragraphs[0], /Senior Cloud Engineer/);
  assert.equal(isCVEmpty(cv), false);
  assert.deepEqual(normalizeCV(cv).coverLetter, cv.coverLetter, "normalization is idempotent");
});

test("cover-letter content alone makes a document non-empty", () => {
  const cv = createEmptyCV(deterministicOptions());
  assert.equal(hasCoverLetterContent(cv), false);

  cv.coverLetter.paragraphs = ["   "];
  assert.equal(hasCoverLetterContent(cv), false, "whitespace is not content");

  cv.coverLetter.paragraphs = ["Saya mengajukan diri untuk posisi ini."];
  assert.equal(hasCoverLetterContent(cv), true);
  assert.equal(isCVEmpty(cv), false);
});


test("header exposes the segmented document switcher with pressed state", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /class="doc-switch" role="group"/);
  assert.match(html, /data-doc-mode="cv" aria-pressed="true"/);
  assert.match(html, /data-doc-mode="cover-letter" aria-pressed="false"/);
  assert.match(html, /data-doc-mode="cover-letter"[^>]*>Surat Lamaran<\/button>/);
  assert.match(html, /<body data-mobile-view="edit" data-doc-mode="cv">/);
});

test("stylesheet swaps CV steps for letter guidance by document mode", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(css, /\.letter-guide\{display:none\}/);
  assert.match(css, /body\[data-doc-mode="cover-letter"\][^{]*#step-list/);
  assert.match(css, /body\[data-doc-mode="cover-letter"\] \.letter-guide\{display:block/);
  assert.match(css, /\.doc-switch button\.active\{background:var\(--surface\);color:var\(--ink\)/);
});

test("letter form wires every field through the shared input handler", () => {
  const cv = createSampleCV(deterministicOptions());
  const html = renderCoverLetterEditor(cv);
  for (const field of ["recipient", "recipientTitle", "city", "date", "greeting", "closing"]) {
    assert.match(html, new RegExp(`data-path="coverLetter\\.${field}"`), `${field} must be editable`);
  }
  assert.match(html, /data-path="coverLetter\.paragraphs" data-value-kind="lines"/);
  assert.match(html, /3 paragraf · \d+ kata/);
});

test("letter form escapes candidate-provided markup", () => {
  const cv = createSampleCV(deterministicOptions());
  cv.coverLetter.recipient = '"><script>alert(1)</script>';
  cv.coverLetter.paragraphs = ["<img src=x onerror=alert(1)>"];
  const html = renderCoverLetterEditor(cv);
  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /<img src=x/);
  assert.match(html, /&lt;script&gt;/);
});

test("reused data block separates required from optional and always offers a way to fill it", () => {
  const sample = createSampleCV(deterministicOptions());
  const filled = renderCoverLetterEditor(sample);
  assert.match(filled, /Terisi · Nama penanda tangan/);
  assert.match(filled, /Terisi · Posisi yang dilamar/);
  // company is only a recommendation, so an empty one must not be flagged red
  assert.match(filled, /Opsional · Perusahaan tujuan/);
  assert.doesNotMatch(filled, /class="template-check fail">Belum ada · Perusahaan/);
  assert.match(filled, /data-action="open-job-panel" data-target="company"/, "an empty field must be reachable");

  const cv = createEmptyCV(deterministicOptions());
  const empty = renderCoverLetterEditor(cv);
  assert.match(empty, /class="template-check fail">Belum ada · Nama penanda tangan/);
  assert.match(empty, /data-action="open-cv-step" data-target="basics"/);
  assert.match(empty, /data-action="open-job-panel" data-target="title"/);
});

test("the letter form renders in the selected interface language", () => {
  const cv = createSampleCV(deterministicOptions());
  const en = renderCoverLetterEditor(cv, "en");
  assert.match(en, /<h1>Cover Letter<\/h1>/);
  assert.match(en, /Reused, no need to type it twice/);
  assert.match(en, /Filled · Name on the signature/);
  assert.match(en, /Optional · Target company/);
  assert.match(en, /Fill it now/);
  assert.match(en, /<label for="letter-recipient">Recipient<\/label>/);
  assert.match(en, /3 paragraphs · \d+ words/);
  assert.doesNotMatch(en, /Penerima|Dipakai ulang|Isi surat/);
  // the wiring must survive translation
  for (const field of COVER_LETTER_FIELDS) {
    assert.match(en, new RegExp(`data-path="coverLetter\\.${field}"`));
  }
});

test("paragraph text round-trips through the newline-separated textarea", () => {
  const paragraphs = ["Paragraf satu.", "Paragraf dua."];
  const text = paragraphsToText(paragraphs);
  assert.equal(text, "Paragraf satu.\n\nParagraf dua.");
  const parsed = text.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
  assert.deepEqual(parsed, paragraphs, "the editor's lines parser must rebuild the same paragraphs");
});


test("letter document is semantic single-column text with contact inside the body", () => {
  const cv = createSampleCV(deterministicOptions());
  cv.coverLetter.date = "2026-09-07";
  const html = renderCoverLetterDocument(cv);
  assert.match(html, /<article class="cv-document theme-clean-sans letter-document"/);
  assert.doesNotMatch(html, /<(?:table|canvas|img|header|footer)\b/i, "ATS-unsafe elements must never appear");
  assert.match(html, /<p class="cv-contact">/, "contact stays in the document body");
  assert.match(html, /Jakarta, 7 September 2026/);
  assert.match(html, /Hal: Lamaran posisi Senior Cloud Engineer/);
  assert.match(html, /<p class="letter-greeting">Dengan hormat,<\/p>/);
  assert.match(html, /<p class="letter-signature">Dina Pratama<\/p>/);
  assert.ok(html.indexOf("letter-greeting") < html.indexOf("letter-closing"), "reading order stays linear");
});

test("letter document escapes markup and rejects unsafe link protocols", () => {
  const cv = createSampleCV(deterministicOptions());
  cv.coverLetter.recipient = "<b>HRD</b>";
  cv.coverLetter.paragraphs = ["<script>alert(1)</script>"];
  cv.basics.links = [{ id: "link-x", label: "Situs", url: "javascript:alert(1)" }];
  const html = renderCoverLetterDocument(cv);
  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /javascript:/);
  assert.match(html, /&lt;script&gt;/);
});

test("letter place line and subject degrade gracefully when data is missing", () => {
  const cv = createEmptyCV(deterministicOptions());
  cv.coverLetter.city = "Bekasi";
  let html = renderCoverLetterDocument(cv);
  assert.match(html, /<p class="letter-place">Bekasi<\/p>/, "city alone is still a valid place line");
  assert.doesNotMatch(html, /letter-subject/, "no target role means no subject line");
  assert.match(html, /class="cv-empty"/);

  cv.meta.locale = "en";
  cv.coverLetter.date = "2026-09-07";
  cv.targetJob.title = "Cloud Engineer";
  html = renderCoverLetterDocument(cv);
  assert.match(html, /Bekasi, 7 September 2026/);
  assert.match(html, /Subject: Application for Cloud Engineer/);
});

test("letter date parsing rejects anything that is not a full ISO date", () => {
  assert.equal(formatLetterDate("2026-09-07", "id"), "7 September 2026");
  assert.equal(formatLetterDate("2026-09", "id"), "");
  assert.equal(formatLetterDate("", "id"), "");
  assert.equal(formatLetterDate(undefined, "id"), "");
});

test("each document exports under its own filename", () => {
  const cv = createSampleCV(deterministicOptions());
  assert.equal(pdfFilename(cv), "dina-pratama-senior-cloud-engineer-cv.pdf");
  assert.equal(pdfFilename(cv, "cover-letter"), "dina-pratama-senior-cloud-engineer-surat-lamaran.pdf");
});

test("printing the cover letter puts only the letter in the print root", () => {
  const cv = createSampleCV(deterministicOptions());
  const root = { innerHTML: "", dataset: {}, setAttribute() {}, removeAttribute() {} };
  const documentRef = { title: "SiapLamar", getElementById: (id) => id === "print-root" ? root : null };
  let printed = false;
  const windowRef = {
    print() {
      printed = true;
      assert.match(root.innerHTML, /letter-document/);
      assert.doesNotMatch(root.innerHTML, /Pengalaman Kerja/, "the CV must not be printed alongside the letter");
      assert.equal(documentRef.title, "dina-pratama-senior-cloud-engineer-surat-lamaran");
    },
    addEventListener() {},
    setTimeout() {},
  };
  const filename = exportTextPDF(cv, { documentRef, windowRef, kind: "cover-letter" });
  assert.equal(printed, true);
  assert.equal(filename, "dina-pratama-senior-cloud-engineer-surat-lamaran.pdf");
});

test("preview and export follow the active document mode", async () => {
  const main = await readFile(new URL("../js/editor-main.js", import.meta.url), "utf8");
  assert.match(main, /documentMode === "cover-letter"\s*\?\s*renderCoverLetterDocument\(cv\)/);
  assert.match(main, /exportTextPDF\(latestState\.cv, \{ kind: documentMode \}\)/);
});

test("stylesheet keeps the letter paper white and its pages unbroken", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(css, /\.letter-document \.letter-signature\{margin:0;font-weight:700\}/);
  assert.match(css, /@media print\{\.print-root \.letter-document p\{break-inside:avoid-page/);
  assert.match(css, /\.cv-document\{[^}]*background:#fff/, "the paper must not follow dark mode");
});


test("an empty letter reports the blocking gaps first", () => {
  const cv = createEmptyCV(deterministicOptions());
  const findings = runCoverLetterChecks(cv);
  const ids = findings.map((entry) => entry.id);
  assert.ok(ids.includes("SL-001"), "missing body is an error");
  assert.ok(ids.includes("SL-002"), "missing signature name is an error");
  assert.ok(ids.includes("SL-003"), "missing contact is an error");
  assert.equal(findings[0].severity, "error", "errors are sorted first");
  assert.ok(findings.every((entry) => entry.id.startsWith("SL-")), "letter findings use their own namespace");
});

test("the sample letter passes without a single error", () => {
  const cv = createSampleCV(deterministicOptions());
  cv.coverLetter.city = "Jakarta";
  cv.coverLetter.date = "2026-09-07";
  const findings = runCoverLetterChecks(cv);
  assert.deepEqual(findings.filter((entry) => entry.severity === "error"), []);
  const stats = coverLetterStats(cv);
  assert.equal(stats.paragraphs, 3);
  assert.ok(stats.words >= LETTER_LENGTH.min && stats.words <= LETTER_LENGTH.max, `sample letter length ${stats.words} must sit in the target range`);
});

test("length rules flag both a too-short and a too-long letter", () => {
  const short = createSampleCV(deterministicOptions());
  short.coverLetter.paragraphs = ["Saya melamar posisi Senior Cloud Engineer di perusahaan ini."];
  const shortIds = runCoverLetterChecks(short).map((entry) => entry.id);
  assert.ok(shortIds.includes("SL-009"), "a short letter is flagged");
  assert.ok(shortIds.includes("SL-011"), "fewer than three paragraphs is a suggestion");

  const long = createSampleCV(deterministicOptions());
  long.coverLetter.paragraphs = [`Senior Cloud Engineer ${"kata ".repeat(LETTER_LENGTH.max + 20)}`];
  const longIds = runCoverLetterChecks(long).map((entry) => entry.id);
  assert.ok(longIds.includes("SL-010"), "a long letter is flagged");
  assert.ok(longIds.includes("SL-012"), "an oversized paragraph is flagged");
});

test("the letter is checked for mentioning the role, the company, and measurable proof", () => {
  const cv = createSampleCV(deterministicOptions());
  cv.targetJob.company = "Nusantara Digital";
  cv.coverLetter.paragraphs = [
    "Saya menulis surat ini untuk melamar pekerjaan yang sedang dibuka.",
    "Saya punya pengalaman panjang membangun platform dan mengelola infrastruktur cloud.",
    "Terima kasih atas waktu dan pertimbangannya.",
  ];
  const ids = runCoverLetterChecks(cv).map((entry) => entry.id);
  assert.ok(ids.includes("SL-007"), "the target role is not mentioned");
  assert.ok(ids.includes("SL-008"), "the company is not mentioned");
  assert.ok(ids.includes("SL-013"), "no measurable evidence");
});

test("keyword coverage for the letter reads the letter text, not the CV", () => {
  const cv = createSampleCV(deterministicOptions());
  cv.targetJob.description = "Kandidat berpengalaman Terraform dan Kubernetes untuk platform observability.";
  cv.coverLetter.paragraphs = ["Saya menulis surat ini tanpa menyebut perkakas apa pun."];
  const cvCoverage = matchJobDescription(cv);
  const letterCoverage = matchJobDescription(cv, cv.targetJob.description, { sourceText: coverLetterToPlainText(cv) });
  assert.ok(cvCoverage.matched.length > 0, "the CV itself does mention the tools");
  assert.equal(letterCoverage.matched.length, 0, "the letter mentions none of them");
  assert.equal(letterCoverage.coverage, 0);
});

test("letter panel shows letter findings and never the CV readiness score", () => {
  const cv = createSampleCV(deterministicOptions());
  cv.targetJob.description = "Kandidat berpengalaman Terraform untuk platform produksi.";
  const { html, report } = renderLetterCheckPanel(cv);
  assert.match(html, /<h2>Kesiapan Surat Lamaran<\/h2>/);
  assert.match(html, /Skor kesiapan 0–100 hanya berlaku untuk CV/);
  assert.doesNotMatch(html, /class="readiness-score"/, "the 0-100 score must not leak into the letter panel");
  assert.doesNotMatch(html, /Skor kesiapan internal/);
  assert.match(html, /Sudah ada di surat/, "coverage labels describe the letter");
  assert.match(html, /Panjang ideal/);
  assert.equal(report.summary.errors, 0);
});

test("letter panel keeps the job-description fields editable and escapes their content", () => {
  const cv = createSampleCV(deterministicOptions());
  cv.targetJob.description = '"><script>alert(1)</script>';
  const { html } = renderLetterCheckPanel(cv);
  assert.match(html, /data-target-job-field="description"/, "the letter mode can still paste a job ad");
  assert.doesNotMatch(html, /<script>/);
});

test("the CV panel keeps its own wording and score untouched", () => {
  const cv = createSampleCV(deterministicOptions());
  cv.targetJob.description = "Kandidat berpengalaman Terraform untuk platform produksi.";
  const html = renderATSCheckPanel(cv, renderCVDocument(cv)).html;
  assert.match(html, /Sudah ada di CV/, "CV coverage wording is unchanged");
  assert.match(html, /class="readiness-score"/);
});


test("the language control is labelled as document scope, not interface scope", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /<label class="settings-row" for="document-locale"><span data-i18n="settings\.documentLanguage">Bahasa dokumen<\/span>/,
    "the label must be visible so it is not mistaken for an app-language switch");
  assert.match(html, /for="language-select"><span data-i18n="settings\.appLanguage">/,
    "app language and document language must be two separate controls");
  assert.doesNotMatch(html, /Bahasa CV/);
});

test("navbar keeps one primary action and moves the rest where they belong", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const header = html.slice(html.indexOf("<header"), html.indexOf("</header>"));
  assert.match(header, /id="pdf-button"/, "the primary action stays in the header");
  assert.match(header, /id="settings-button"[^>]*aria-expanded="false"[^>]*aria-controls="settings-panel"/);
  assert.doesNotMatch(header, /id="sample-button"|id="clear-button"/, "data actions move to the sidebar");
  assert.doesNotMatch(html, /id="check-button"/, "the check button duplicated the Pemeriksaan tab");
  assert.match(html, /data-preview-mode="check"/, "checking stays reachable from the panel tab");
  assert.match(html, /class="data-actions">[\s\S]*id="sample-button"[\s\S]*id="clear-button"/);
});

test("document language switches document labels only, never the typed content", () => {
  const cv = createSampleCV(deterministicOptions());
  cv.coverLetter.city = "Jakarta";
  cv.coverLetter.date = "2026-09-17";

  const indonesian = renderCoverLetterDocument(cv);
  assert.match(indonesian, /Kepada/);
  assert.match(indonesian, /Hal: Lamaran posisi/);
  assert.match(indonesian, /17 September 2026/);

  cv.meta.locale = "en";
  const english = renderCoverLetterDocument(cv);
  assert.match(english, /To<br>/);
  assert.match(english, /Subject: Application for/);
  assert.doesNotMatch(english, /Kepada/);
  // the greeting and body are the candidate's own words, so they must survive untouched
  assert.match(english, /Dengan hormat,/);
  assert.match(english, /Melalui surat ini saya mengajukan diri/);
});


test("form rows do not stretch a field because its neighbour has help text", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(css, /\.entry-grid\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\);gap:14px;align-items:start\}/,
    "without align-items:start a taller neighbour cell stretches the whole row, pulling label and input apart");
  // the checkbox still opts out deliberately so it lines up with the input next to it
  assert.match(css, /\.checkbox-field\{align-self:end/);
});
