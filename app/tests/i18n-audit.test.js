import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { DICTIONARIES } from "../js/i18n.js";

const MODULES = new URL("../js/", import.meta.url);

// Every file allowed to contain Indonesian text, each with the reason it is exempt.
// A blanket regex would flag correct code, so the exemptions are explicit.
const ALLOWED_INDONESIAN = {
  "i18n.js": "the interface dictionary itself",
  "editor-copy.js": "the editor and letter copy dictionary",
  "letter-checks.js": "letter finding copy table",
  "ats-checker.js": "ATS check copy table",
  "ats-score.js": "readiness score copy table",
  "completeness.js": "validation copy table and the bilingual action-verb heuristic",
  "preview.js": "document text, which follows the document language, not the interface",
  "model.js": "sample CV content, which is content rather than interface",
  "storage.js": "storage error fallbacks, mapped to keys by error name in the view",
  "keyword-match.js": "Indonesian stopword and phrase heuristics for parsing job ads",
  "pdf-export.js": "the filename token travels with the document, so it follows the document language",
  "main.js": "unused legacy Stage 3 entry point",
  "backup.js": "unused legacy module",
};

const INDONESIAN_MARKERS = /\b(dan|atau|yang|tidak|belum|sudah|dengan|untuk|pada|dari|ini|itu|Anda|wajib|tambahkan|gunakan|pilih|kosongkan|surat|tanggal|nama|lengkap|paragraf|dokumen|bagian|periksa|simpan|hapus|entri|kata|keterampilan|pengalaman|ringkasan|perusahaan|dipakai|diisi|terisi|opsional|dukungan)\b/i;

test("no interface module hides Indonesian text outside the dictionaries", async () => {
  const files = (await readdir(MODULES)).filter((name) => name.endsWith(".js")).sort();
  const leaks = [];
  for (const file of files) {
    if (file in ALLOWED_INDONESIAN) continue;
    const source = await readFile(new URL(file, MODULES), "utf8");
    for (const match of source.matchAll(/"([^"\n]{6,})"|'([^'\n]{6,})'|`([^`]{6,})`/g)) {
      const value = match[1] ?? match[2] ?? match[3];
      if (INDONESIAN_MARKERS.test(value)) leaks.push(`${file}: ${value.replace(/\s+/g, " ").slice(0, 90)}`);
    }
  }
  assert.deepEqual(leaks, [], `translate these or add a documented exemption:\n- ${leaks.join("\n- ")}`);
});

test("the exemption list stays honest about which files exist", async () => {
  const files = new Set((await readdir(MODULES)).filter((name) => name.endsWith(".js")));
  for (const [file, reason] of Object.entries(ALLOWED_INDONESIAN)) {
    assert.ok(files.has(file), `${file} is exempted but no longer exists — drop the exemption`);
    assert.ok(reason.length > 15, `${file} needs a real reason, not a placeholder`);
  }
});

test("the shell declares a key for every language-dependent accessible label", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const ariaLabels = [...html.matchAll(/<([a-z]+)([^>]*\baria-label="[^"]+"[^>]*)>/g)];
  const unkeyed = ariaLabels
    .filter(([, , attrs]) => !attrs.includes("data-i18n-aria"))
    .map(([tag, , attrs]) => `${tag} ${(attrs.match(/aria-label="([^"]+)"/) ?? [])[1]}`);
  assert.deepEqual(unkeyed, [], `these accessible labels never change language:\n- ${unkeyed.join("\n- ")}`);
});

test("page title and lang attribute follow the interface language", async () => {
  const main = await readFile(new URL("../js/editor-main.js", import.meta.url), "utf8");
  assert.match(main, /document\.title = appT\("app\.title"\)/, "the tab title must follow the language");
  const i18n = await readFile(new URL("../js/i18n.js", import.meta.url), "utf8");
  assert.match(i18n, /if \(root\) root\.lang = current/, "the lang attribute must follow the language");
  for (const key of ["app.title", "brand.home", "print.unavailable"]) {
    assert.ok(key in DICTIONARIES.id && key in DICTIONARIES.en, `${key} must exist in both dictionaries`);
  }
});

test("developer-only errors stay in English and never reach the dictionaries", async () => {
  const entryActions = await readFile(new URL("../js/entry-actions.js", import.meta.url), "utf8");
  assert.match(entryActions, /Unknown collection/);
  assert.match(entryActions, /Unknown direction/);
  assert.doesNotMatch(entryActions, /tidak dikenal/, "these are thrown for programmer mistakes, not shown to users");
});

test("user-facing errors carry a name the view can translate", async () => {
  const { exportTextPDF } = await import("../js/pdf-export.js");
  const { createSampleCV } = await import("../js/model.js");
  assert.throws(
    () => exportTextPDF(createSampleCV(), { documentRef: { getElementById: () => null }, windowRef: {} }),
    (error) => error.name === "PrintUnavailableError",
    "the view maps the name to a key, so the message is never shown in a fixed language",
  );
});

test("the exported filename follows the document language", async () => {
  const { pdfFilename } = await import("../js/pdf-export.js");
  const { createSampleCV } = await import("../js/model.js");
  const cv = createSampleCV();
  assert.equal(pdfFilename(cv, "cover-letter"), "dina-pratama-senior-cloud-engineer-surat-lamaran.pdf");
  cv.meta.locale = "en";
  assert.equal(pdfFilename(cv, "cover-letter"), "dina-pratama-senior-cloud-engineer-cover-letter.pdf");
  assert.equal(pdfFilename(cv), "dina-pratama-senior-cloud-engineer-cv.pdf", "the CV suffix is the same in both");
});
