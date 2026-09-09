import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createEmptyCV, createSampleCV } from "../js/model.js";
import { addEntry, duplicateEntry, moveEntry, removeEntry, updateEntry } from "../js/entry-actions.js";
import { analyzeBullet, evaluateCompleteness, validateAll, validateStep } from "../js/completeness.js";
import { renderEditor } from "../js/editor.js";
import { formatMonth, renderCVDocument } from "../js/preview.js";

function deterministicOptions() {
  let sequence = 0;
  return {
    idFactory: (prefix) => `${prefix}-${++sequence}`,
    now: () => new Date("2026-09-04T08:00:00.000Z"),
  };
}

test("repeatable entries support add, update, duplicate, reorder, and remove without mutating source", () => {
  const original = createEmptyCV(deterministicOptions());
  const added = addEntry(original, "experience", { idFactory: () => "exp-a" });
  assert.equal(original.experience.length, 0);
  assert.equal(added.experience.length, 1);
  const updated = updateEntry(added, "experience", "exp-a", "role", "Cloud Engineer");
  assert.equal(added.experience[0].role, "");
  assert.equal(updated.experience[0].role, "Cloud Engineer");
  const duplicated = duplicateEntry(updated, "experience", "exp-a", { idFactory: () => "exp-b" });
  assert.deepEqual(duplicated.experience.map((entry) => entry.id), ["exp-a", "exp-b"]);
  assert.equal(duplicated.experience[1].role, "Cloud Engineer");
  const moved = moveEntry(duplicated, "experience", "exp-b", "up");
  assert.deepEqual(moved.experience.map((entry) => entry.id), ["exp-b", "exp-a"]);
  const removed = removeEntry(moved, "experience", "exp-b");
  assert.deepEqual(removed.experience.map((entry) => entry.id), ["exp-a"]);
});

test("nested professional links use the same repeatable-entry operations", () => {
  const cv = createEmptyCV(deterministicOptions());
  const withLink = addEntry(cv, "links", { idFactory: () => "link-a" });
  const labeled = updateEntry(withLink, "links", "link-a", "label", "LinkedIn");
  assert.equal(labeled.basics.links[0].label, "LinkedIn");
  assert.equal(cv.basics.links.length, 0);
});

test("sample CV is complete while empty CV reports required fields", () => {
  const empty = createEmptyCV(deterministicOptions());
  const sample = createSampleCV(deterministicOptions());
  assert.equal(evaluateCompleteness(empty).percent, 0);
  assert.equal(evaluateCompleteness(sample).percent, 100);
  assert.ok(validateStep(empty, "basics").length >= 5);
  assert.equal(validateAll(sample).length, 0);
});

test("validation catches reverse date ranges and incomplete repeatable entries", () => {
  let cv = createSampleCV(deterministicOptions());
  cv.experience[0].endDate = "2020-01";
  cv.experience[0].current = false;
  cv.experience[0].startDate = "2022-01";
  const issues = validateStep(cv, "experience");
  assert.ok(issues.some((entry) => entry.path.endsWith("endDate")));
  cv.basics.links.push({ id: "broken-link", label: "Portfolio", url: "" });
  assert.ok(validateStep(cv, "basics").some((entry) => entry.path === "links.broken-link.url"));
});

test("bullet guidance distinguishes measurable impact from vague duties", () => {
  const strong = analyzeBullet("Mengurangi waktu pemulihan insiden sebesar 35% melalui dashboard observability dan runbook operasional.");
  const weak = analyzeBullet("Bertanggung jawab atas cloud.");
  assert.equal(strong.strong, true);
  assert.equal(weak.strong, false);
  assert.ok(weak.suggestions.length > 0);
});

test("editor renders controls and escapes candidate-provided markup", () => {
  const cv = createSampleCV(deterministicOptions());
  cv.basics.fullName = '<img src=x onerror="alert(1)">';
  const basics = renderEditor(cv, "basics", [{ path: "basics.email", message: "Periksa email." }]);
  const experience = renderEditor(cv, "experience");
  assert.doesNotMatch(basics, /<img\b/i);
  assert.match(basics, /&lt;img/);
  assert.match(basics, /data-action="add" data-collection="links"/);
  assert.match(experience, /data-action="duplicate"/);
  assert.match(experience, /data-action="move-up"/);
  assert.match(basics, /Periksa email/);
});

test("preview is semantic, single-column text in controlled section order", () => {
  const cv = createSampleCV(deterministicOptions());
  const html = renderCVDocument(cv, "experience");
  assert.match(html, /<article class="cv-document\b/);
  assert.match(html, /Dina Pratama/);
  assert.ok(html.indexOf("Ringkasan Profesional") < html.indexOf("Pengalaman Kerja"));
  assert.ok(html.indexOf("Pengalaman Kerja") < html.indexOf("Pendidikan"));
  assert.doesNotMatch(html, /<(?:table|canvas|img|header|footer)\b/i);
  assert.match(html, /data-preview-section="experience"/);
});

test("preview escapes markup and rejects unsafe link protocols", () => {
  const cv = createSampleCV(deterministicOptions());
  cv.summary = "<script>alert(1)</script>";
  cv.basics.links = [{ id: "bad", label: "Portfolio", url: "javascript:alert(1)" }];
  const html = renderCVDocument(cv);
  assert.doesNotMatch(html, /<script>/i);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /href="javascript:/i);
});

test("month formatting follows selected CV language", () => {
  assert.match(formatMonth("2026-09", "id"), /2026/);
  assert.match(formatMonth("2026-09", "en"), /Sep/);
  assert.equal(formatMonth("invalid", "id"), "");
});

test("application entry page exposes editor, preview, mobile, and check surfaces", async () => {
  const html = await readFile(new URL("../editor.html", import.meta.url), "utf8");
  for (const id of ["step-list", "editor-root", "preview-root", "check-root", "mobile-step-select", "completion-value"]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /src="\.\/js\/editor-main\.js"/);
});

test("Stage 4 browser integration contains no network client", async () => {
  const main = await readFile(new URL("../js/editor-main.js", import.meta.url), "utf8");
  assert.doesNotMatch(main, /\b(?:fetch|XMLHttpRequest|WebSocket)\b/);
});
