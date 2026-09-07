import { analyzeBullet } from "./completeness.js";
import { editorCopy, fill } from "./editor-copy.js";

export const EDITOR_STEP_KEYS = Object.freeze(["basics", "summary", "experience", "education", "skills", "extras"]);

export function editorSteps(language = "id") {
  const copy = editorCopy(language);
  return EDITOR_STEP_KEYS.map((key) => ({ key, ...copy.steps[key] }));
}

// Kept for callers that only need the canonical step order and default labels.
export const EDITOR_STEPS = editorSteps("id");

const esc = (value = "") => String(value).replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
}[character]));

// Structure only: input types, list parsing, and layout. All text comes from editor-copy.js.
const FIELD_STRUCTURE = {
  links: [{ key: "label" }, { key: "url", type: "url" }],
  experience: [
    { key: "role" }, { key: "organization" }, { key: "location" },
    { key: "startDate", type: "month" }, { key: "endDate", type: "month", disabledWhenCurrent: true },
    { key: "current", type: "checkbox" },
    { key: "bullets", type: "textarea", list: "lines", wide: true },
  ],
  education: [
    { key: "qualification" }, { key: "field" }, { key: "institution" }, { key: "location" },
    { key: "startDate", type: "month" }, { key: "endDate", type: "month" },
    { key: "bullets", type: "textarea", list: "lines", wide: true },
  ],
  skills: [{ key: "name" }, { key: "items", type: "textarea", list: "comma", wide: true }],
  projects: [
    { key: "name" }, { key: "role" },
    { key: "startDate", type: "month" }, { key: "endDate", type: "month" },
    { key: "url", type: "url" },
    { key: "bullets", type: "textarea", list: "lines", wide: true },
  ],
  certifications: [
    { key: "name" }, { key: "issuer" }, { key: "date", type: "month" },
    { key: "credentialId" }, { key: "url", type: "url", wide: true },
  ],
  languages: [{ key: "name" }, { key: "proficiency" }],
  awards: [
    { key: "title" }, { key: "issuer" }, { key: "date", type: "month" },
    { key: "description", type: "textarea", wide: true },
  ],
  volunteering: [
    { key: "role" }, { key: "organization" },
    { key: "startDate", type: "month" }, { key: "endDate", type: "month" },
    { key: "bullets", type: "textarea", list: "lines", wide: true },
  ],
};

const BASICS_STRUCTURE = [
  { key: "fullName", wide: true },
  { key: "headline", wide: true },
  { key: "email", type: "email" },
  { key: "phone", type: "tel" },
  { key: "location", wide: true },
];

function configFor(copy, key) {
  const text = copy.collections[key];
  return {
    ...text,
    fields: FIELD_STRUCTURE[key].map((field) => ({ ...field, ...(text.fields[field.key] ?? {}) })),
  };
}

function errorsByPath(errors) {
  return new Map(errors.map((entry) => [entry.path, entry.message]));
}

function valueForField(item, field) {
  const value = item[field.key];
  if (field.list === "lines") return Array.isArray(value) ? value.join("\n") : "";
  if (field.list === "comma") return Array.isArray(value) ? value.join(", ") : "";
  return value ?? "";
}

function renderField(field, item, path, dataAttributes, errorMap, copy) {
  const error = errorMap.get(path);
  const id = `field-${path.replace(/[^a-z0-9_-]/gi, "-")}`;
  const attrs = Object.entries(dataAttributes).map(([key, value]) => `data-${key}="${esc(value)}"`).join(" ");
  const invalid = error ? `aria-invalid="true" aria-describedby="${id}-error"` : "";
  const wide = field.wide ? " field-wide" : "";
  if (field.type === "checkbox") {
    return `<div class="field checkbox-field${wide}"><label><input type="checkbox" ${item[field.key] ? "checked" : ""} ${attrs} data-value-kind="boolean"> ${esc(field.label)}</label>${error ? `<small class="field-error" id="${id}-error">${esc(error)}</small>` : ""}</div>`;
  }
  const value = valueForField(item, field);
  const common = `id="${id}" ${attrs} ${invalid} ${field.list ? `data-value-kind="${field.list}"` : ""}`;
  const control = field.type === "textarea"
    ? `<textarea ${common} placeholder="${esc(field.placeholder ?? "")}">${esc(value)}</textarea>`
    : `<input ${common} type="${esc(field.type ?? "text")}" value="${esc(value)}" placeholder="${esc(field.placeholder ?? "")}" ${field.disabledWhenCurrent && item.current ? "disabled" : ""}>`;
  let quality = "";
  if (field.list === "lines" && ["bullets"].includes(field.key)) {
    const bullets = Array.isArray(item[field.key]) ? item[field.key].filter(Boolean) : [];
    const strong = bullets.filter((bullet) => analyzeBullet(bullet).strong).length;
    quality = bullets.length
      ? `<small class="quality-hint">${esc(fill(copy.bulletQuality, { strong, total: bullets.length }))}</small>`
      : "";
  }
  return `<div class="field${wide}" data-error="${error ? "true" : "false"}"><label for="${id}">${esc(field.label)}</label>${control}${field.help ? `<small>${esc(field.help)}</small>` : ""}${quality}${error ? `<small class="field-error" id="${id}-error">${esc(error)}</small>` : ""}</div>`;
}

function collectionAt(cv, key) { return key === "links" ? cv.basics.links : cv[key]; }

function entryTitle(config, item, index) {
  const first = config.fields.find((field) => field.type !== "checkbox");
  return String(item[first.key] || `${config.singular[0].toUpperCase()}${config.singular.slice(1)} ${index + 1}`);
}

function renderCollection(cv, key, errorMap, copy, compact = false) {
  const config = configFor(copy, key);
  const entries = collectionAt(cv, key);
  const cards = entries.map((item, index) => {
    const fields = config.fields.map((field) => renderField(
      field, item, `${key}.${item.id}.${field.key}`,
      { collection: key, id: item.id, field: field.key }, errorMap, copy,
    )).join("");
    return `<article class="entry-card" data-entry-id="${esc(item.id)}"><header class="entry-header"><div><span>${esc(config.singular)} ${index + 1}</span><strong>${esc(entryTitle(config, item, index))}</strong></div><div class="entry-actions"><button type="button" data-action="move-up" data-collection="${key}" data-id="${esc(item.id)}" ${index === 0 ? "disabled" : ""}>${esc(copy.entryUp)}</button><button type="button" data-action="move-down" data-collection="${key}" data-id="${esc(item.id)}" ${index === entries.length - 1 ? "disabled" : ""}>${esc(copy.entryDown)}</button><button type="button" data-action="duplicate" data-collection="${key}" data-id="${esc(item.id)}">${esc(copy.entryDuplicate)}</button><button class="danger-link" type="button" data-action="remove" data-collection="${key}" data-id="${esc(item.id)}">${esc(copy.entryRemove)}</button></div></header><div class="entry-grid">${fields}</div></article>`;
  }).join("");
  const collectionError = errorMap.get(key);
  const count = entries.length ? esc(fill(copy.entryCount, { count: entries.length })) : esc(copy.entryEmpty);
  const empty = `<div class="empty-entry">${esc(fill(copy.collectionEmpty, { singular: config.singular }))}</div>`;
  return `<section class="collection${compact ? " collection-compact" : ""}"><div class="collection-heading"><div><h3>${esc(config.title)}</h3><p>${count}</p></div><button class="secondary-action" type="button" data-action="add" data-collection="${key}">${esc(config.add)}</button></div>${collectionError ? `<p class="collection-error">${esc(collectionError)}</p>` : ""}${cards || empty}</section>`;
}

function renderBasics(cv, errorMap, copy) {
  const fields = BASICS_STRUCTURE.map((field) => ({ ...field, ...(copy.basics[field.key] ?? {}) }));
  const rendered = fields
    .map((field) => renderField(field, cv.basics, `basics.${field.key}`, { path: `basics.${field.key}` }, errorMap, copy))
    .join("");
  return `<div class="form-section"><div class="entry-grid">${rendered}</div></div>${renderCollection(cv, "links", errorMap, copy, true)}`;
}

function renderSummary(cv, errorMap, copy) {
  const error = errorMap.get("summary");
  return `<div class="form-section"><div class="field field-wide" data-error="${error ? "true" : "false"}"><label for="summary-field">${esc(copy.summaryLabel)}</label><textarea id="summary-field" data-path="summary" maxlength="700" aria-invalid="${error ? "true" : "false"}" placeholder="${esc(copy.summaryPlaceholder)}">${esc(cv.summary)}</textarea><div class="field-meta"><small>${esc(copy.summaryMeta)}</small><small>${cv.summary.length}/700</small></div>${error ? `<small class="field-error">${esc(error)}</small>` : ""}</div></div>`;
}

function renderStepBody(cv, stepKey, errorMap, copy) {
  if (stepKey === "basics") return renderBasics(cv, errorMap, copy);
  if (stepKey === "summary") return renderSummary(cv, errorMap, copy);
  if (["experience", "education", "skills"].includes(stepKey)) return renderCollection(cv, stepKey, errorMap, copy);
  return `<div class="optional-intro">${esc(copy.optionalIntro)}</div>${["projects", "certifications", "languages", "awards", "volunteering"].map((key) => renderCollection(cv, key, errorMap, copy, true)).join("")}`;
}

export function renderEditor(cv, stepKey, errors = [], language = "id") {
  const copy = editorCopy(language);
  const steps = editorSteps(language);
  const step = steps.find((item) => item.key === stepKey) ?? steps[0];
  const index = steps.indexOf(step);
  const errorMap = errorsByPath(errors);
  const summary = errors.length
    ? `<div class="validation-summary" role="alert"><strong>${esc(fill(copy.validationTitle, { count: errors.length }))}</strong><p>${esc(copy.validationBody)}</p></div>`
    : "";
  const counter = esc(fill(copy.stepCounter, { index: index + 1, total: steps.length }));
  const nextLabel = index === steps.length - 1 ? copy.review : copy.next;
  return `<div class="editor-heading"><span class="eyebrow">${counter}</span><h1>${esc(step.label)}</h1><p>${esc(step.description)}</p></div><aside class="writing-tip"><strong>${esc(copy.tipTitle)}</strong><span>${esc(step.example)}</span></aside>${summary}<div class="editor-body">${renderStepBody(cv, step.key, errorMap, copy)}</div><footer class="editor-footer"><button class="button secondary" type="button" data-action="previous-step" ${index === 0 ? "disabled" : ""}>${esc(copy.previous)}</button><button class="button" type="button" data-action="next-step">${esc(nextLabel)}</button></footer>`;
}
