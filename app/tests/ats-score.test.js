import test from "node:test";
import assert from "node:assert/strict";
import { createEmptyCV, createSampleCV } from "../js/model.js";
import { ATS_SCORE_WEIGHTS, calculateATSReadiness } from "../js/ats-score.js";
import { renderCVDocument } from "../js/preview.js";
import { renderATSCheckPanel } from "../js/checker-view.js";

function options() {
  let id = 0;
  return { idFactory: (prefix) => `${prefix}-${++id}`, now: () => new Date("2026-09-04T08:00:00Z") };
}

test("ATS readiness category weights total exactly 100", () => {
  assert.equal(Object.values(ATS_SCORE_WEIGHTS).reduce((sum, value) => sum + value, 0), 100);
});

test("complete sample scores high and exposes four category breakdowns", () => {
  const cv = createSampleCV(options());
  const result = calculateATSReadiness(cv, renderCVDocument(cv, ""));
  assert.ok(result.score >= 85 && result.score <= 100, `unexpected score ${result.score}`);
  assert.equal(result.maximum, 100);
  assert.equal(result.categories.length, 4);
  assert.equal(result.categories.reduce((sum, category) => sum + category.maximum, 0), 100);
  assert.equal(result.keywordCoverageIncluded, false);
});

test("empty CV remains below ready range even though its template is structurally safe", () => {
  const cv = createEmptyCV(options());
  const result = calculateATSReadiness(cv, renderCVDocument(cv, ""));
  assert.ok(result.score < 50, `empty CV scored ${result.score}`);
  assert.equal(result.label, "Belum siap");
});

test("invalid date and unsafe theme reduce their respective categories", () => {
  const cv = createSampleCV(options());
  const baseline = calculateATSReadiness(cv, renderCVDocument(cv, ""));
  cv.settings.theme = "unsafe-columns";
  cv.experience[0].current = false;
  cv.experience[0].endDate = "2020-01";
  const degraded = calculateATSReadiness(cv, renderCVDocument(cv, ""));
  assert.ok(degraded.score < baseline.score);
  assert.ok(degraded.categories.find((item) => item.key === "structure").earned < 35);
  assert.ok(degraded.categories.find((item) => item.key === "consistency").earned < 15);
});

test("job-description keywords never change readiness score", () => {
  const cv = createSampleCV(options());
  const before = calculateATSReadiness(cv, renderCVDocument(cv, "")).score;
  cv.targetJob.description = "SAP Oracle COBOL mainframe procurement accounting";
  const after = calculateATSReadiness(cv, renderCVDocument(cv, "")).score;
  assert.equal(after, before);
});

test("checker UI labels score as internal and shows every category", () => {
  const cv = createSampleCV(options());
  const rendered = renderATSCheckPanel(cv, renderCVDocument(cv, ""));
  assert.match(rendered.html, /Skor kesiapan internal/);
  assert.match(rendered.html, /\/100/);
  for (const label of ["Struktur ATS", "Kelengkapan", "Kualitas Konten", "Konsistensi"]) assert.match(rendered.html, new RegExp(label));
  assert.match(rendered.html, /Bukan skor resmi Workday/);
});
