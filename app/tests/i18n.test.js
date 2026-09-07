import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  DEFAULT_LANGUAGE,
  DICTIONARIES,
  LANGUAGES,
  LANGUAGE_STORAGE_KEY,
  applyStaticTranslations,
  normalizeLanguage,
  persistLanguage,
  readLanguage,
  setupLanguageControl,
  translator,
} from "../js/i18n.js";

function createStorage(initial = new Map()) {
  return {
    getItem: (key) => initial.has(key) ? initial.get(key) : null,
    setItem: (key, value) => initial.set(key, value),
    removeItem: (key) => initial.delete(key),
    values: initial,
  };
}

test("both dictionaries cover exactly the same keys", () => {
  const id = Object.keys(DICTIONARIES.id).sort();
  const en = Object.keys(DICTIONARIES.en).sort();
  assert.deepEqual(en, id, "a key present in one language but not the other would render as a raw key");
  for (const [language, dictionary] of Object.entries(DICTIONARIES)) {
    for (const [key, value] of Object.entries(dictionary)) {
      assert.equal(typeof value, "string", `${language}.${key} must be a string`);
      assert.notEqual(value.trim(), "", `${language}.${key} must not be empty`);
    }
  }
});

test("app language is a closed set with an Indonesian default", () => {
  assert.deepEqual(LANGUAGES, ["id", "en"]);
  assert.equal(DEFAULT_LANGUAGE, "id");
  assert.equal(normalizeLanguage("en"), "en");
  assert.equal(normalizeLanguage("jp"), "id");
  assert.equal(normalizeLanguage(null), "id");
});

test("a missing key degrades to Indonesian and then to the key itself", () => {
  const t = translator("en");
  assert.equal(t("action.exportPdf"), "Export PDF");
  assert.equal(t("definitely.missing.key"), "definitely.missing.key");
  assert.equal(translator("id")("doc.letter"), "Surat Lamaran");
});

test("placeholders are interpolated and unknown ones are left visible", () => {
  const t = translator("id");
  assert.equal(t("brand.tagline", { unused: 1 }), "CV ATS Generator");
  const raw = translator("id")("{count} paragraf");
  assert.equal(raw, "{count} paragraf", "an unknown key passes through so the interpolation contract stays testable");
});

test("language preference persists, clears on default, and survives blocked storage", () => {
  const storage = createStorage();
  assert.equal(readLanguage(storage), "id");
  persistLanguage(storage, "en");
  assert.equal(storage.values.get(LANGUAGE_STORAGE_KEY), "en");
  assert.equal(readLanguage(storage), "en");
  persistLanguage(storage, "id");
  assert.equal(storage.values.has(LANGUAGE_STORAGE_KEY), false, "the default is stored as absence");

  const blocked = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); }, removeItem() { throw new Error("blocked"); } };
  assert.equal(readLanguage(blocked), "id");
  assert.equal(persistLanguage(blocked, "en"), "en");
});

test("the control applies the language, the lang attribute, and cross-tab changes", () => {
  const listeners = new Map();
  const select = {
    value: "",
    addEventListener: (type, handler) => listeners.set(`select:${type}`, handler),
    removeEventListener: (type) => listeners.delete(`select:${type}`),
  };
  const windowRef = {
    addEventListener: (type, handler) => listeners.set(`win:${type}`, handler),
    removeEventListener: (type) => listeners.delete(`win:${type}`),
  };
  const root = { lang: "" };
  const storage = createStorage(new Map([[LANGUAGE_STORAGE_KEY, "en"]]));
  const seen = [];

  const control = setupLanguageControl({ select, root, storage, windowRef, onChange: (l) => seen.push(l) });
  assert.equal(control.language, "en");
  assert.equal(root.lang, "en", "the document language attribute must follow the interface language");
  assert.equal(select.value, "en");
  assert.deepEqual(seen, ["en"]);

  listeners.get("select:change")({ target: { value: "id" } });
  assert.equal(root.lang, "id");
  assert.equal(storage.values.has(LANGUAGE_STORAGE_KEY), false);

  listeners.get("win:storage")({ key: LANGUAGE_STORAGE_KEY, newValue: "en" });
  assert.equal(root.lang, "en", "another tab switching language is followed");
  assert.deepEqual(seen, ["en", "id", "en"]);
  control.destroy();
});

test("static translation rewrites text and aria labels only where keys are declared", () => {
  const nodes = [
    { dataset: { i18n: "action.sample" }, textContent: "Isi contoh" },
    { dataset: { i18n: "definitely.missing" }, textContent: "keep" },
  ];
  const ariaNodes = [{ dataset: { i18nAria: "doc.group" }, attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } }];
  const root = {
    querySelectorAll: (selector) => selector === "[data-i18n]" ? nodes : ariaNodes,
  };
  applyStaticTranslations(translator("en"), root);
  assert.equal(nodes[0].textContent, "Load sample");
  assert.equal(nodes[1].textContent, "definitely.missing", "unknown keys are visible instead of blank");
  assert.equal(ariaNodes[0].attrs["aria-label"], "Active document");
});

test("every declared key in the shell exists in both dictionaries", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const keys = [...html.matchAll(/data-i18n(?:-aria)?="([^"]+)"/g)].map((match) => match[1]);
  assert.ok(keys.length >= 25, `expected the shell to be keyed, found ${keys.length}`);
  for (const key of new Set(keys)) {
    assert.ok(key in DICTIONARIES.id, `id dictionary is missing ${key}`);
    assert.ok(key in DICTIONARIES.en, `en dictionary is missing ${key}`);
  }
});

test("the issue counters are not destroyed by translating their tab labels", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /<span data-i18n="view\.check">[^<]*<\/span> <span id="issue-count">/);
  assert.match(html, /<span data-i18n="view\.check">[^<]*<\/span> <span id="mobile-issue-count">/);
});


test("editor copy has identical structure in both languages", async () => {
  const { EDITOR_COPY } = await import("../js/editor-copy.js");
  const shape = (tree) => {
    if (typeof tree === "string") return "string";
    return Object.fromEntries(Object.keys(tree).sort().map((key) => [key, shape(tree[key])]));
  };
  assert.deepEqual(shape(EDITOR_COPY.en), shape(EDITOR_COPY.id),
    "a label present in one language but missing in the other would render as undefined");
});

test("the CV editor renders in the selected interface language", async () => {
  const { renderEditor, editorSteps } = await import("../js/editor.js");
  const { createSampleCV } = await import("../js/model.js");
  const cv = createSampleCV();

  const id = renderEditor(cv, "experience", [], "id");
  assert.match(id, /<h1>Pengalaman<\/h1>/);
  assert.match(id, /Langkah 3 dari 6/);
  assert.match(id, /Tambah pengalaman/);
  assert.match(id, /Simpan dan lanjut/);
  assert.match(id, /Saya masih bekerja di sini/);

  const en = renderEditor(cv, "experience", [], "en");
  assert.match(en, /<h1>Experience<\/h1>/);
  assert.match(en, /Step 3 of 6/);
  assert.match(en, /Add role/);
  assert.match(en, /Save and continue/);
  assert.match(en, /I still work here/);
  assert.doesNotMatch(en, /Pengalaman kerja|Sebelumnya|Duplikat/);

  assert.deepEqual(editorSteps("en").map((step) => step.key), editorSteps("id").map((step) => step.key),
    "the step order must not depend on language");
  assert.equal(editorSteps("en")[0].label, "Your details");
});

test("editor falls back to Indonesian for an unknown language", async () => {
  const { renderEditor } = await import("../js/editor.js");
  const { createEmptyCV } = await import("../js/model.js");
  const html = renderEditor(createEmptyCV(), "summary", [], "fr");
  assert.match(html, /Ringkasan profesional/, "an unsupported language degrades to readable text");
});

test("validation and bullet-quality copy follow the language", async () => {
  const { renderEditor } = await import("../js/editor.js");
  const { createSampleCV } = await import("../js/model.js");
  const cv = createSampleCV();
  const errors = [{ path: "basics.email", message: "Check the email." }];

  assert.match(renderEditor(cv, "basics", errors, "id"), /1 hal perlu diperbaiki/);
  assert.match(renderEditor(cv, "basics", errors, "en"), /1 things need fixing/);
  assert.match(renderEditor(cv, "experience", [], "id"), /dari 2 bullet memuat aksi/);
  assert.match(renderEditor(cv, "experience", [], "en"), /of 2 bullets carry an action/);
});


test("letter findings are translated and keep their identifiers", async () => {
  const { runCoverLetterChecks, LETTER_FINDING_COPY } = await import("../js/letter-checks.js");
  const { createEmptyCV } = await import("../js/model.js");

  const idShape = Object.keys(LETTER_FINDING_COPY.id).sort();
  const enShape = Object.keys(LETTER_FINDING_COPY.en).sort();
  assert.deepEqual(enShape, idShape, "every finding must exist in both languages");
  assert.equal(idShape.length, 14);

  const cv = createEmptyCV();
  const indonesian = runCoverLetterChecks(cv, "id");
  const english = runCoverLetterChecks(cv, "en");
  assert.deepEqual(english.map((entry) => entry.id), indonesian.map((entry) => entry.id),
    "the same conditions must produce the same findings in both languages");
  assert.match(indonesian.find((entry) => entry.id === "SL-001").title, /Isi surat belum ada/);
  assert.match(english.find((entry) => entry.id === "SL-001").title, /no body yet/);
});

test("interpolated finding text carries the role, company, and counts", async () => {
  const { runCoverLetterChecks } = await import("../js/letter-checks.js");
  const { createSampleCV } = await import("../js/model.js");
  const cv = createSampleCV();
  cv.targetJob.company = "Nusantara Digital";
  cv.coverLetter.paragraphs = ["Saya menulis surat singkat."];

  const en = runCoverLetterChecks(cv, "en");
  assert.match(en.find((entry) => entry.id === "SL-007").message, /Senior Cloud Engineer/);
  assert.match(en.find((entry) => entry.id === "SL-008").message, /Nusantara Digital/);
  assert.match(en.find((entry) => entry.id === "SL-009").title, /too short \(4 words\)/);
  assert.match(en.find((entry) => entry.id === "SL-011").title, /Only 1 paragraphs/);
});

test("the letter panel renders in the selected interface language", async () => {
  const { renderLetterCheckPanel } = await import("../js/checker-view.js");
  const { createSampleCV } = await import("../js/model.js");
  const cv = createSampleCV();
  cv.targetJob.description = "Terraform dan Kubernetes untuk platform produksi.";

  const en = renderLetterCheckPanel(cv, "en").html;
  assert.match(en, /<h2>Cover Letter Readiness<\/h2>/);
  assert.match(en, /Transparent checks/);
  assert.match(en, /Letter size/);
  assert.match(en, /Ideal length/);
  assert.match(en, /Already in the letter/);
  assert.match(en, /Job match/);
  assert.match(en, /Target role/);
  assert.doesNotMatch(en, /Kesiapan Surat|Ukuran surat|Sesuai lowongan|Posisi target/);
  assert.doesNotMatch(en, /class="readiness-score"/, "the CV score still must not appear on the letter panel");

  const id = renderLetterCheckPanel(cv, "id").html;
  assert.match(id, /<h2>Kesiapan Surat Lamaran<\/h2>/);
  assert.match(id, /Sudah ada di surat/);
});


test("validation messages and bullet guidance follow the interface language", async () => {
  const { validateStep, validateAll, analyzeBullet } = await import("../js/completeness.js");
  const { createEmptyCV } = await import("../js/model.js");
  const cv = createEmptyCV();

  const id = validateStep(cv, "basics", "id");
  const en = validateStep(cv, "basics", "en");
  assert.deepEqual(en.map((entry) => entry.path), id.map((entry) => entry.path),
    "the same gaps must be reported in both languages, only the wording changes");
  assert.match(id.find((entry) => entry.path === "basics.email").message, /Email wajib diisi/);
  assert.match(en.find((entry) => entry.path === "basics.email").message, /An email address is required/);

  assert.equal(validateAll(cv, "en").length, validateAll(cv, "id").length);
  assert.match(validateStep(cv, "basics").find((entry) => entry.path === "basics.email").message, /wajib diisi/,
    "the default stays Indonesian for callers that pass no language");

  assert.match(analyzeBullet("", "en").suggestions[0], /Write the action/);
  assert.match(analyzeBullet("", "id").suggestions[0], /Tuliskan aksi/);
  const weak = analyzeBullet("Bertanggung jawab atas deployment", "en");
  assert.equal(weak.strong, false);
  assert.ok(weak.suggestions.some((line) => /action verb/.test(line)));
});

test("bullet strength detection is language-agnostic", async () => {
  const { analyzeBullet } = await import("../js/completeness.js");
  const indonesian = analyzeBullet("Membangun platform Amazon EKS untuk 25 workload produksi dengan Terraform.");
  const english = analyzeBullet("Built an Amazon EKS platform for 25 production workloads using Terraform.");
  assert.equal(indonesian.strong, true);
  assert.equal(english.strong, true, "an English bullet must be recognised even when the interface is Indonesian");
});


test("ATS findings are translated, keep their ids, and carry a stable code", async () => {
  const { runATSChecks } = await import("../js/ats-checker.js");
  const { createEmptyCV } = await import("../js/model.js");
  const cv = createEmptyCV();

  const id = runATSChecks(cv, { language: "id" });
  const en = runATSChecks(cv, { language: "en" });
  assert.deepEqual(en.map((entry) => entry.id), id.map((entry) => entry.id));
  assert.deepEqual(en.map((entry) => entry.code), id.map((entry) => entry.code));
  assert.ok(en.every((entry) => typeof entry.code === "string" && entry.code.length > 0),
    "every finding needs a language-independent code");
  assert.match(id.find((entry) => entry.code === "nameMissing").title, /Nama lengkap belum ada/);
  assert.match(en.find((entry) => entry.code === "nameMissing").title, /No full name yet/);
});

test("the template audit judges by finding code, not by translated prose", async () => {
  const { evaluateTemplateSafety } = await import("../js/ats-checker.js");
  const multiColumn = '<article class="cv-document" style="grid-template-columns: 1fr 1fr"><h2>Ringkasan Profesional</h2></article>';

  for (const language of ["id", "en"]) {
    const result = evaluateTemplateSafety(multiColumn, "clean-sans", language);
    const layout = result.checks.find((entry) => entry.id === "layout");
    assert.equal(layout.pass, false,
      `a multi-column layout must fail in ${language}; matching on words like "kolom" would silently pass once translated`);
  }
  assert.notEqual(
    evaluateTemplateSafety(multiColumn, "clean-sans", "en").checks[0].label,
    evaluateTemplateSafety(multiColumn, "clean-sans", "id").checks[0].label,
    "the labels themselves are still translated",
  );
});

test("the readiness score is identical across languages and only its labels change", async () => {
  const { calculateATSReadiness } = await import("../js/ats-score.js");
  const { createSampleCV } = await import("../js/model.js");
  const { renderCVDocument } = await import("../js/preview.js");
  const cv = createSampleCV();
  const html = renderCVDocument(cv);

  const id = calculateATSReadiness(cv, html, "id");
  const en = calculateATSReadiness(cv, html, "en");
  assert.equal(en.score, id.score, "translation must never move the score");
  assert.deepEqual(en.categories.map((c) => c.earned), id.categories.map((c) => c.earned));
  assert.deepEqual(en.categories.map((c) => c.key), id.categories.map((c) => c.key));
  assert.equal(id.label, "Sangat siap");
  assert.equal(en.label, "Very ready");
  assert.equal(en.categories[0].label, "ATS structure");
  assert.equal(en.keywordCoverageIncluded, false);
});

test("the CV check panel renders in the selected interface language", async () => {
  const { renderATSCheckPanel } = await import("../js/checker-view.js");
  const { createSampleCV } = await import("../js/model.js");
  const { renderCVDocument } = await import("../js/preview.js");
  const cv = createSampleCV();
  cv.targetJob.description = "Terraform dan Kubernetes untuk platform produksi.";
  const preview = renderCVDocument(cv);

  const en = renderATSCheckPanel(cv, preview, "en").html;
  assert.match(en, /<h2>ATS Readiness<\/h2>/);
  assert.match(en, /Internal readiness score/);
  assert.match(en, /Active template/);
  assert.match(en, /Clean Sans/);
  assert.match(en, /Already in the CV/);
  assert.match(en, /not an official Workday, Greenhouse/);
  assert.doesNotMatch(en, /Kesiapan ATS|Template aktif|Bersih Sans|Skor kesiapan internal/);

  const id = renderATSCheckPanel(cv, preview, "id").html;
  assert.match(id, /<h2>Kesiapan ATS<\/h2>/);
  assert.match(id, /Bersih Sans/);
  assert.match(id, /class="readiness-score"/);
});
