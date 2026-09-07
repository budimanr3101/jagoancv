import test from "node:test";
import assert from "node:assert/strict";
import { SAMPLE_TEXT, createEmptyCV, createSampleCV, normalizeCV } from "../js/model.js";
import { runCoverLetterChecks, coverLetterStats, LETTER_LENGTH } from "../js/letter-checks.js";
import { runATSChecks } from "../js/ats-checker.js";
import { renderCVDocument, renderCoverLetterDocument } from "../js/preview.js";

function deterministicOptions(extra = {}) {
  let sequence = 0;
  return {
    idFactory: (prefix) => `${prefix}-${++sequence}`,
    now: () => new Date("2026-09-07T03:00:00.000Z"),
    ...extra,
  };
}

test("the sample follows the document language and defaults to Indonesian", () => {
  const fallback = createSampleCV(deterministicOptions());
  assert.equal(fallback.meta.locale, "id");
  assert.match(fallback.summary, /pengalaman membangun platform AWS/);

  const english = createSampleCV(deterministicOptions({ locale: "en" }));
  assert.equal(english.meta.locale, "en", "loading an English sample must set the document language too");
  assert.match(english.summary, /experience building AWS platforms/);
  assert.doesNotMatch(english.summary, /pengalaman/);

  assert.equal(createSampleCV(deterministicOptions({ locale: "fr" })).meta.locale, "id",
    "an unsupported locale falls back rather than producing an empty document");
});

test("both samples have an identical document shape", () => {
  const id = createSampleCV(deterministicOptions());
  const en = createSampleCV(deterministicOptions({ locale: "en" }));
  for (const key of ["experience", "education", "projects", "certifications", "skills", "languages"]) {
    assert.equal(en[key].length, id[key].length, `${key} must have the same number of entries`);
  }
  assert.equal(en.experience[0].bullets.length, id.experience[0].bullets.length);
  assert.equal(en.coverLetter.paragraphs.length, id.coverLetter.paragraphs.length);
  assert.equal(en.basics.fullName, id.basics.fullName, "a person's name is not translated");
  assert.equal(en.certifications[0].name, id.certifications[0].name, "certification names are proper nouns");
  assert.deepEqual(en.skills.map((g) => g.items), id.skills.map((g) => g.items), "tool names stay as they are");
  assert.equal(en.experience[0].startDate, id.experience[0].startDate, "dates are locale-independent data");
});

test("the English sample is translated where it matters", () => {
  const en = createSampleCV(deterministicOptions({ locale: "en" }));
  assert.equal(en.education[0].qualification, "Bachelor of Computer Science");
  assert.equal(en.projects[0].name, "AWS Landing Zone");
  assert.equal(en.languages[0].name, "Indonesian");
  assert.equal(en.coverLetter.recipient, "Hiring Team");
  assert.match(en.experience[0].bullets[0], /^Built an Amazon EKS platform/);
  assert.deepEqual(Object.keys(SAMPLE_TEXT.en).sort(), Object.keys(SAMPLE_TEXT.id).sort());
});

test("the English sample passes the app's own checks", () => {
  const en = createSampleCV(deterministicOptions({ locale: "en" }));
  en.coverLetter.city = "Jakarta";
  en.coverLetter.date = "2026-09-07";

  const letterErrors = runCoverLetterChecks(en, "en").filter((entry) => entry.severity === "error");
  assert.deepEqual(letterErrors, [], "the shipped English letter must not fail its own rules");
  const stats = coverLetterStats(en);
  assert.ok(stats.words >= LETTER_LENGTH.min && stats.words <= LETTER_LENGTH.max,
    `English letter length ${stats.words} must sit inside the target range`);

  const cvErrors = runATSChecks(en, { previewHTML: renderCVDocument(en), language: "en" })
    .filter((entry) => entry.severity === "error");
  assert.deepEqual(cvErrors, [], "the shipped English CV must not fail its own ATS rules");
});

test("the English sample renders English document labels", () => {
  const en = createSampleCV(deterministicOptions({ locale: "en" }));
  en.coverLetter.city = "Jakarta";
  en.coverLetter.date = "2026-09-07";

  const cv = renderCVDocument(en);
  assert.match(cv, /<h2>Work Experience<\/h2>/);
  assert.doesNotMatch(cv, /Pengalaman Kerja/);

  const letter = renderCoverLetterDocument(en);
  assert.match(letter, /Subject: Application for Senior Cloud Engineer/);
  assert.match(letter, /7 September 2026/);
});

test("clearing the document keeps the chosen document language", () => {
  const empty = createEmptyCV({ locale: "en" });
  assert.equal(empty.meta.locale, "en", "clearing must not silently switch the document back to Indonesian");
  assert.equal(normalizeCV(empty).meta.locale, "en");
});


test("the sidebar offers a sample-language selector next to the button", async () => {
  const { readFile } = await import("node:fs/promises");
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const actions = html.slice(html.indexOf('class="data-actions"'), html.indexOf("</aside>"));
  assert.match(actions, /for="sample-locale"><span data-i18n="action\.sampleLanguage">/);
  assert.match(actions, /<option value="id" data-i18n="language\.id">/);
  assert.match(actions, /<option value="en" data-i18n="language\.en">/);
  assert.ok(actions.indexOf("sample-locale") < actions.indexOf("sample-button"),
    "the language choice must sit next to the action it changes");

  const main = await readFile(new URL("../js/editor-main.js", import.meta.url), "utf8");
  assert.match(main, /elements\.sampleLocale\?\.value === "en" \? "en" : "id"/,
    "the button must load the language picked in the dropdown");
});
