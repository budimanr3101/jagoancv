import { createEmptyCV, createSampleCV, isCVEmpty, normalizeCV } from "./model.js";
import { createLocalRepository } from "./storage.js";
import { createCVStore } from "./store.js";
import { addEntry, duplicateEntry, moveEntry, removeEntry, updateEntry } from "./entry-actions.js";
import { evaluateCompleteness, validateStep } from "./completeness.js";
import { EDITOR_STEPS, editorSteps, renderEditor } from "./editor.js";
import { renderCVDocument, renderCoverLetterDocument } from "./preview.js";
import { renderATSCheckPanel, renderLetterCheckPanel } from "./checker-view.js";
import { exportTextPDF } from "./pdf-export.js";
import { setupThemeControl } from "./theme.js";
import { COVER_LETTER_FIELDS, renderCoverLetterEditor } from "./cover-letter.js";
import { DEFAULT_LANGUAGE, applyStaticTranslations, setupLanguageControl, translator } from "./i18n.js";

const byId = (id) => document.getElementById(id);
const elements = {
  saveState: byId("save-state"), saveMessage: byId("save-message"), locale: byId("document-locale"), appearance: byId("theme-select"),
  language: byId("language-select"), sampleLocale: byId("sample-locale"),
  docModeButtons: [...document.querySelectorAll(".doc-switch button[data-doc-mode]")],
  workspace: document.querySelector(".editor-workspace"),
  previewPanel: document.querySelector(".preview-panel"),
  editTab: document.querySelector('[data-view="edit"]'),
  notice: byId("notice"), sample: byId("sample-button"), clear: byId("clear-button"),
  pdf: byId("pdf-button"), settings: byId("settings-button"), settingsPanel: byId("settings-panel"),
  completion: byId("completion-value"), completionBar: byId("completion-bar"), completionCopy: byId("completion-copy"),
  stepList: byId("step-list"), mobileStep: byId("mobile-step-select"), editor: byId("editor-root"),
  previewRoot: byId("preview-root"), previewStage: byId("preview-stage"), previewHolder: byId("preview-holder"),
  previewView: byId("preview-view"), checkView: byId("check-view"), checkRoot: byId("check-root"),
  previewScale: byId("preview-scale-label"), issueCount: byId("issue-count"), mobileIssueCount: byId("mobile-issue-count"),
};

setupThemeControl({ select: elements.appearance });

const escapeHTML = (value = "") => String(value).replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
}[character]));

let memoryDocument = null;
const memoryRepository = {
  load: () => memoryDocument,
  save: (value) => { memoryDocument = value; },
  clear: () => { memoryDocument = null; },
};

let repository;
let initialDocument;
let bootError = null;
try {
  repository = createLocalRepository();
  const stored = repository.load();
  initialDocument = stored ? normalizeCV(stored) : createEmptyCV();
} catch (error) {
  repository = memoryRepository;
  initialDocument = createEmptyCV();
  bootError = error;
}

const store = createCVStore({ document: initialDocument, repository });
let latestState = store.getState();
let activeStepIndex = 0;
let activeErrors = [];
let previewMode = "preview";
let documentMode = "cv";
let appT = translator(DEFAULT_LANGUAGE);
let appLanguage = DEFAULT_LANGUAGE;
let forceEditorRender = true;
let forceCheckRender = true;

function showNotice(message, type = "info") {
  elements.notice.hidden = !message;
  elements.notice.textContent = message;
  elements.notice.className = type === "error" ? "notice app-notice error" : "notice app-notice";
}

function setPath(cv, path, value) {
  if (path === "summary") cv.summary = value;
  else if (path.startsWith("basics.")) cv.basics[path.split(".")[1]] = value;
  else if (path.startsWith("coverLetter.")) {
    const key = path.slice("coverLetter.".length);
    if (COVER_LETTER_FIELDS.includes(key)) cv.coverLetter[key] = value;
  }
  if (["basics.fullName", "basics.headline"].includes(path)) {
    cv.meta.title = [cv.basics.fullName, cv.basics.headline].filter(Boolean).join(" — ") || "CV Baru";
  }
  return cv;
}

function parseFieldValue(target) {
  const kind = target.dataset.valueKind;
  if (kind === "boolean") return target.checked;
  if (kind === "lines") return target.value.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
  if (kind === "comma") return target.value.split(",").map((value) => value.trim()).filter(Boolean);
  return target.value;
}

function fitPreview() {
  const sheet = elements.previewRoot.querySelector(".cv-document");
  if (!sheet || !elements.previewStage.clientWidth) return;
  elements.previewRoot.style.transform = "none";
  elements.previewRoot.style.width = "auto";
  elements.previewRoot.style.height = "auto";
  const naturalWidth = sheet.offsetWidth;
  const naturalHeight = sheet.scrollHeight;
  const available = Math.max(260, elements.previewStage.clientWidth - 28);
  const scale = Math.min(1, available / naturalWidth);
  elements.previewRoot.style.transformOrigin = "top left";
  elements.previewRoot.style.transform = `scale(${scale})`;
  elements.previewHolder.style.width = `${Math.ceil(naturalWidth * scale)}px`;
  elements.previewHolder.style.height = `${Math.ceil(naturalHeight * scale)}px`;
  elements.previewScale.textContent = `A4 · ${Math.round(scale * 100)}%`;
}

function stepStatus(completeness, step, index) {
  if (index === activeStepIndex) return { label: appT("step.active"), className: "active" };
  const state = completeness.steps[step.key];
  if (state.errors) return { label: appT("step.errors", { count: state.errors }), className: "has-errors" };
  if (state.done) return { label: appT("step.done"), className: "complete" };
  return { label: appT("step.incomplete"), className: "" };
}

function renderNavigation(cv) {
  const completeness = evaluateCompleteness(cv);
  elements.completion.textContent = `${completeness.percent}%`;
  elements.completionBar.style.width = `${completeness.percent}%`;
  elements.completionCopy.textContent = appT("steps.progress", { done: completeness.completed, total: completeness.total });
  const steps = editorSteps(appLanguage);
  elements.stepList.innerHTML = steps.map((step, index) => {
    const status = stepStatus(completeness, step, index);
    return `<li><button class="step-button ${status.className}" type="button" data-step-index="${index}" ${index === activeStepIndex ? "aria-current=\"step\"" : ""}><span class="step-number">${index + 1}</span><span class="step-copy"><strong>${escapeHTML(step.label)}</strong><small>${escapeHTML(status.label)}</small></span></button></li>`;
  }).join("");
  elements.mobileStep.innerHTML = steps.map((step, index) => `<option value="${index}" ${index === activeStepIndex ? "selected" : ""}>${index + 1}. ${escapeHTML(step.label)}</option>`).join("");
  return completeness;
}

function renderCheckPanel(cv) {
  const rendered = documentMode === "cover-letter"
    ? renderLetterCheckPanel(cv, appLanguage)
    : renderATSCheckPanel(cv, renderCVDocument(cv, EDITOR_STEPS[activeStepIndex].key), appLanguage);
  elements.checkRoot.innerHTML = rendered.html;
  const actionable = rendered.report.summary.errors + rendered.report.summary.warnings;
  elements.issueCount.textContent = String(actionable);
  elements.mobileIssueCount.textContent = String(actionable);
  return rendered.report;
}

function renderPreviewPanel(cv) {
  elements.previewRoot.innerHTML = documentMode === "cover-letter"
    ? renderCoverLetterDocument(cv)
    : renderCVDocument(cv, EDITOR_STEPS[activeStepIndex].key);
  requestAnimationFrame(fitPreview);
}

function renderCurrentEditor(cv) {
  elements.editor.innerHTML = documentMode === "cover-letter"
    ? renderCoverLetterEditor(cv, appLanguage)
    : renderEditor(cv, EDITOR_STEPS[activeStepIndex].key, activeErrors, appLanguage);
}

const SAVE_STATUS_KEYS = { idle: "save.idle", pending: "save.pending", saved: "save.saved" };
const STORAGE_ERROR_KEYS = {
  StorageFullError: "save.full",
  StorageAccessError: "save.blocked",
  StorageCorruptError: "save.corrupt",
};

function saveMessageFor(save) {
  if (save.status !== "error") return appT(SAVE_STATUS_KEYS[save.status] ?? "save.idle");
  const key = STORAGE_ERROR_KEYS[save.error?.name];
  return key ? appT(key) : save.message;
}

function renderApp(state, force = false) {
  latestState = state;
  elements.saveState.dataset.status = state.save.status;
  elements.saveMessage.textContent = saveMessageFor(state.save);
  elements.locale.value = state.cv.meta.locale;
  if (documentMode === "cv") renderNavigation(state.cv);
  renderPreviewPanel(state.cv);
  if (force || forceCheckRender || !elements.checkRoot.contains(document.activeElement)) renderCheckPanel(state.cv);
  if (force || forceEditorRender || !elements.editor.contains(document.activeElement)) renderCurrentEditor(state.cv);
  forceEditorRender = false;
  forceCheckRender = false;
  if (state.save.status === "error") showNotice(state.save.message, "error");
}

function selectStep(index, { focus = true } = {}) {
  activeStepIndex = Math.max(0, Math.min(index, EDITOR_STEPS.length - 1));
  activeErrors = [];
  forceEditorRender = true;
  document.body.dataset.mobileView = "edit";
  updateMobileViewButtons("edit");
  renderApp(latestState, true);
  if (focus) requestAnimationFrame(() => elements.editor.querySelector("h1")?.focus?.());
}

function showFirstError() {
  requestAnimationFrame(() => {
    const target = elements.editor.querySelector('[data-error="true"] input, [data-error="true"] textarea, [aria-invalid="true"]');
    target?.focus();
  });
}

function goNext() {
  const stepKey = EDITOR_STEPS[activeStepIndex].key;
  activeErrors = validateStep(latestState.cv, stepKey, appLanguage);
  if (activeErrors.length) {
    forceEditorRender = true;
    renderApp(latestState, true);
    showFirstError();
    return;
  }
  if (activeStepIndex < EDITOR_STEPS.length - 1) selectStep(activeStepIndex + 1);
  else {
    setPreviewMode("check");
    setMobileView("check");
  }
}

function setPreviewMode(mode) {
  previewMode = mode;
  const isPreview = mode === "preview";
  elements.previewView.hidden = !isPreview;
  elements.checkView.hidden = isPreview;
  document.querySelectorAll("[data-preview-mode]").forEach((button) => {
    const active = button.dataset.previewMode === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  if (isPreview) requestAnimationFrame(fitPreview);
}

function updateMobileViewButtons(view) {
  document.querySelectorAll("[data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
}

function setMobileView(view) {
  document.body.dataset.mobileView = view;
  updateMobileViewButtons(view);
  if (view === "check") setPreviewMode("check");
  if (view === "preview") setPreviewMode("preview");
  requestAnimationFrame(fitPreview);
}

const MODE_LABEL_KEYS = {
  cv: { edit: "view.editCv", workspace: "workspace.cv", preview: "panel.cv" },
  "cover-letter": { edit: "view.editLetter", workspace: "workspace.letter", preview: "panel.letter" },
};

function updateModeLabels() {
  const keys = MODE_LABEL_KEYS[documentMode];
  if (elements.editTab) elements.editTab.textContent = appT(keys.edit);
  elements.workspace?.setAttribute("aria-label", appT(keys.workspace));
  elements.previewPanel?.setAttribute("aria-label", appT(keys.preview));
}

function setDocumentMode(mode) {
  documentMode = mode === "cover-letter" ? "cover-letter" : "cv";
  document.body.dataset.docMode = documentMode;
  for (const button of elements.docModeButtons) {
    const active = button.dataset.docMode === documentMode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  }
  updateModeLabels();
  activeErrors = [];
  forceEditorRender = true;
  forceCheckRender = true;
  setMobileView("edit");
  renderApp(latestState, true);
}

store.subscribe((state) => renderApp(state));

if (elements.sampleLocale) elements.sampleLocale.value = latestState.cv.meta.locale;

setupLanguageControl({
  select: elements.language,
  onChange: (language) => {
    appLanguage = language;
    appT = translator(language);
    applyStaticTranslations(appT);
    document.title = appT("app.title");
    updateModeLabels();
    if (latestState) {
      forceEditorRender = true;
      forceCheckRender = true;
      renderApp(latestState, true);
    }
  },
});

if (bootError) {
  const key = STORAGE_ERROR_KEYS[bootError.name];
  showNotice(`${key ? appT(key) : bootError.message} ${appT("save.sessionOnly")}`, "error");
}

elements.stepList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-step-index]");
  if (button) selectStep(Number(button.dataset.stepIndex));
});
elements.mobileStep.addEventListener("change", (event) => selectStep(Number(event.target.value), { focus: false }));

elements.editor.addEventListener("input", (event) => {
  const target = event.target.closest("[data-path], [data-collection][data-field]");
  if (!target || target.dataset.valueKind === "boolean") return;
  const value = parseFieldValue(target);
  if (target.dataset.path) store.update((cv) => setPath(cv, target.dataset.path, value));
  else store.update((cv) => updateEntry(cv, target.dataset.collection, target.dataset.id, target.dataset.field, value));
  target.removeAttribute("aria-invalid");
  const field = target.closest(".field");
  if (field) field.dataset.error = "false";
});

elements.editor.addEventListener("change", (event) => {
  const target = event.target.closest('[data-value-kind="boolean"]');
  if (!target) return;
  forceEditorRender = true;
  store.update((cv) => updateEntry(cv, target.dataset.collection, target.dataset.id, target.dataset.field, target.checked));
});

elements.editor.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  if (action === "open-cv-step") {
    const stepIndex = EDITOR_STEPS.findIndex((step) => step.key === button.dataset.target);
    setDocumentMode("cv");
    if (stepIndex >= 0) selectStep(stepIndex);
    return;
  }
  if (action === "open-job-panel") {
    setMobileView("check");
    const field = button.dataset.target;
    requestAnimationFrame(() => document.getElementById(`target-job-${field}`)?.focus?.());
    return;
  }
  if (action === "next-step") return goNext();
  if (action === "previous-step") return selectStep(activeStepIndex - 1);
  const key = button.dataset.collection;
  const id = button.dataset.id;
  if (action === "remove" && !confirm(appT("confirm.removeEntry"))) return;
  let next = latestState.cv;
  if (action === "add") next = addEntry(next, key);
  if (action === "remove") next = removeEntry(next, key, id);
  if (action === "duplicate") next = duplicateEntry(next, key, id);
  if (action === "move-up") next = moveEntry(next, key, id, "up");
  if (action === "move-down") next = moveEntry(next, key, id, "down");
  forceEditorRender = true;
  store.replace(next);
});

elements.locale.addEventListener("change", (event) => {
  if (elements.sampleLocale) elements.sampleLocale.value = event.target.value;
  store.update((cv) => { cv.meta.locale = event.target.value; });
});

elements.sample.addEventListener("click", () => {
  if (!isCVEmpty(latestState.cv) && !confirm(appT("confirm.sample"))) return;
  activeStepIndex = 0; activeErrors = []; forceEditorRender = true;
  // The sample is document content, so its language is chosen next to the button
  // and it sets the document language to match.
  const locale = elements.sampleLocale?.value === "en" ? "en" : "id";
  store.replace(createSampleCV({ locale })); store.flush();
  showNotice(appT("notice.sampleLoaded"));
});

elements.clear.addEventListener("click", () => {
  if (!confirm(appT("confirm.clear"))) return;
  activeStepIndex = 0; activeErrors = []; forceEditorRender = true;
  store.replace(createEmptyCV({ locale: latestState.cv.meta.locale })); store.flush();
  showNotice(appT("notice.cleared"));
});

elements.pdf.addEventListener("click", () => {
  try {
    store.flush();
    const filename = exportTextPDF(latestState.cv, { kind: documentMode });
    const document_ = appT(documentMode === "cover-letter" ? "document.letter" : "document.cv");
    showNotice(appT("notice.printOpened", { document: document_, filename }));
  } catch (error) {
    const reason = error.name === "PrintUnavailableError" ? appT("print.unavailable") : error.message;
    showNotice(appT("notice.printFailed", { message: reason }), "error");
  }
});

elements.checkRoot.addEventListener("input", (event) => {
  const target = event.target.closest("[data-target-job-field]");
  if (!target) return;
  store.update((cv) => { cv.targetJob[target.dataset.targetJobField] = target.value; });
});

elements.checkRoot.addEventListener("focusout", () => {
  setTimeout(() => {
    if (!elements.checkRoot.contains(document.activeElement)) {
      forceCheckRender = true;
      renderApp(latestState);
    }
  }, 0);
});

elements.checkRoot.addEventListener("click", (event) => {
  const stepButton = event.target.closest("[data-go-step]");
  if (stepButton) {
    const index = EDITOR_STEPS.findIndex((step) => step.key === stepButton.dataset.goStep);
    if (index >= 0) selectStep(index);
    return;
  }
  const keywordButton = event.target.closest("[data-keyword-action]");
  if (!keywordButton) return;
  const keyword = keywordButton.dataset.keyword;
  forceCheckRender = true;
  store.update((cv) => {
    const dismissed = new Set(cv.targetJob.dismissedKeywords);
    if (keywordButton.dataset.keywordAction === "dismiss") dismissed.add(keyword);
    else dismissed.delete(keyword);
    cv.targetJob.dismissedKeywords = [...dismissed];
  });
});

function setSettingsOpen(open) {
  elements.settingsPanel.hidden = !open;
  elements.settings.setAttribute("aria-expanded", String(open));
}

elements.settings.addEventListener("click", (event) => {
  event.stopPropagation();
  setSettingsOpen(elements.settingsPanel.hidden);
});
elements.settingsPanel.addEventListener("click", (event) => event.stopPropagation());
document.addEventListener("click", () => setSettingsOpen(false));
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || elements.settingsPanel.hidden) return;
  setSettingsOpen(false);
  elements.settings.focus?.();
});
elements.docModeButtons.forEach((button) => button.addEventListener("click", () => setDocumentMode(button.dataset.docMode)));
document.querySelectorAll("[data-preview-mode]").forEach((button) => button.addEventListener("click", () => setPreviewMode(button.dataset.previewMode)));
document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => setMobileView(button.dataset.view)));
window.addEventListener("resize", () => requestAnimationFrame(fitPreview));
if (globalThis.ResizeObserver) new ResizeObserver(() => fitPreview()).observe(elements.previewStage);
window.addEventListener("pagehide", () => store.flush());
