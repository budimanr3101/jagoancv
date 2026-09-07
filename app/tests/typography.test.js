import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createSampleCV, normalizeCV } from "../js/model.js";
import { evaluateTemplateSafety, runATSChecks } from "../js/ats-checker.js";
import { renderCVDocument } from "../js/preview.js";

test("legacy typography preferences normalize to Bersih Sans", () => {
  const legacy = createSampleCV();
  legacy.settings.theme = "classic-serif";
  assert.equal(normalizeCV(legacy).settings.theme, "clean-sans");
});

test("preview always renders the clean sans class", () => {
  const cv = createSampleCV();
  cv.settings.theme = "classic-serif";
  const html = renderCVDocument(cv);
  assert.match(html, /class="cv-document theme-clean-sans"/);
  assert.doesNotMatch(html, /classic-serif/);
});

test("production shell and stylesheet expose no typography selector or serif theme", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  assert.doesNotMatch(html, /template-select|Klasik Serif/);
  assert.doesNotMatch(css, /header-template|theme-classic-serif/);
  assert.match(css, /\.cv-document\.theme-clean-sans\{font-family:Arial,Helvetica,sans-serif\}/);
});

test("ATS template audit accepts only Bersih Sans", () => {
  const cv = createSampleCV();
  const previewHTML = renderCVDocument(cv);
  assert.equal(evaluateTemplateSafety(previewHTML, "clean-sans").safe, true);
  assert.equal(evaluateTemplateSafety(previewHTML, "classic-serif").safe, false);
  cv.settings.theme = "classic-serif";
  assert.ok(runATSChecks(cv, { previewHTML }).some((finding) => finding.id === "ATS-005"));
});
