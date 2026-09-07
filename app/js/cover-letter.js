import { editorCopy, fill } from "./editor-copy.js";

const esc = (value = "") => String(value).replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
}[character]));

export const COVER_LETTER_FIELDS = Object.freeze([
  "recipient", "recipientTitle", "city", "date", "greeting", "paragraphs", "closing",
]);

// Structure only; every label and placeholder comes from editor-copy.js.
const FIELD_STRUCTURE = [
  { key: "recipient", id: "letter-recipient" },
  { key: "recipientTitle", id: "letter-recipient-title" },
  { key: "city", id: "letter-city" },
  { key: "date", id: "letter-date", type: "date" },
  { key: "greeting", id: "letter-greeting" },
  { key: "closing", id: "letter-closing" },
];

function textField({ id, key, label, value, placeholder = "", help = "", type = "text" }) {
  return `<div class="field" data-error="false">` +
    `<label for="${id}">${esc(label)}</label>` +
    `<input id="${id}" type="${type}" data-path="coverLetter.${key}" value="${esc(value)}" placeholder="${esc(placeholder)}">` +
    (help ? `<small>${esc(help)}</small>` : "") +
    `</div>`;
}

export function paragraphsToText(paragraphs = []) {
  return paragraphs.filter((value) => typeof value === "string").join("\n\n");
}

function reusedDataBlock(cv, letterCopy) {
  const rows = [
    {
      label: letterCopy.signerLabel, hint: letterCopy.signerHint, value: cv.basics.fullName,
      required: true, action: "open-cv-step", target: "basics",
    },
    {
      label: letterCopy.roleLabel, hint: letterCopy.roleHint, value: cv.targetJob.title,
      required: true, action: "open-job-panel", target: "title",
    },
    {
      label: letterCopy.companyLabel, hint: letterCopy.companyHint, value: cv.targetJob.company,
      required: false, action: "open-job-panel", target: "company",
    },
  ];
  const items = rows.map((row) => {
    const filled = typeof row.value === "string" && row.value.trim().length > 0;
    const state = filled ? "pass" : row.required ? "fail" : "";
    const status = filled ? letterCopy.statusFilled : row.required ? letterCopy.statusMissing : letterCopy.statusOptional;
    const jump = filled
      ? ""
      : ` <button type="button" data-action="${esc(row.action)}" data-target="${esc(row.target)}">${esc(letterCopy.fillNow)}</button>`;
    return `<p class="template-check ${state}">${esc(status)} · ${esc(row.label)}: ` +
      `<strong>${filled ? esc(row.value) : "—"}</strong> <span>${esc(row.hint)}</span>${jump}</p>`;
  }).join("");
  return `<section class="optional-intro"><strong>${esc(letterCopy.reusedTitle)}</strong>${items}</section>`;
}

export function renderCoverLetterEditor(cv, language = "id") {
  const copy = editorCopy(language);
  const letterCopy = copy.letter;
  const letter = cv.coverLetter;
  const paragraphText = paragraphsToText(letter.paragraphs);
  const paragraphCount = letter.paragraphs.filter((value) => value.trim()).length;
  const wordCount = paragraphText.split(/\s+/).filter(Boolean).length;

  const fields = FIELD_STRUCTURE.map((field) => textField({
    id: field.id,
    key: field.key,
    type: field.type ?? "text",
    value: letter[field.key],
    ...letterCopy.fields[field.key],
  })).join("");

  return `<div class="editor-heading">` +
    `<span class="eyebrow">${esc(letterCopy.eyebrow)}</span>` +
    `<h1>${esc(letterCopy.title)}</h1>` +
    `<p>${esc(letterCopy.intro)}</p>` +
    `</div>` +
    `<aside class="writing-tip"><strong>${esc(copy.tipTitle)}</strong><span>${esc(letterCopy.tip)}</span></aside>` +
    reusedDataBlock(cv, letterCopy) +
    `<div class="editor-body"><div class="form-section"><div class="entry-grid">` +
      fields +
      `<div class="field field-wide" data-error="false">` +
        `<label for="letter-paragraphs">${esc(letterCopy.fields.paragraphs.label)}</label>` +
        `<textarea id="letter-paragraphs" data-path="coverLetter.paragraphs" data-value-kind="lines" rows="12" placeholder="${esc(letterCopy.example)}">${esc(paragraphText)}</textarea>` +
        `<div class="field-meta">` +
          `<small>${esc(letterCopy.bodyHelp)}</small>` +
          `<small>${esc(fill(letterCopy.paragraphMeta, { paragraphs: paragraphCount, words: wordCount }))}</small>` +
        `</div>` +
        `<small class="quality-hint">${esc(letterCopy.lengthHint)}</small>` +
      `</div>` +
    `</div></div></div>`;
}
