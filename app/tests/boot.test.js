import test from "node:test";
import assert from "node:assert/strict";
import { createSampleCV } from "../js/model.js";

// The browser entry module touches `document` at import time, so no other test file
// ever executed it. A broken import or a missing element there produced a blank page
// that `node --check` and the renderer tests could not see. This boots it for real.
function installDOM({ stored = null } = {}) {
  const registry = new Map();
  const makeEl = (key = "") => {
    const element = {
      key, dataset: {}, style: {}, innerHTML: "", textContent: "", value: "", hidden: false,
      listeners: new Map(),
      classList: { toggle() {}, add() {}, remove() {}, contains: () => false },
      addEventListener(type, handler) { this.listeners.set(type, handler); },
      removeEventListener(type) { this.listeners.delete(type); },
      setAttribute() {}, removeAttribute() {}, getAttribute: () => null,
      querySelector: () => makeEl(), querySelectorAll: () => [],
      closest: () => null, contains: () => false, focus() {},
      offsetWidth: 794, scrollHeight: 1123, clientWidth: 794,
    };
    return element;
  };
  const byKey = (key) => {
    if (!registry.has(key)) registry.set(key, makeEl(key));
    return registry.get(key);
  };

  globalThis.document = {
    title: "SiapLamar",
    body: byKey("body"),
    documentElement: byKey("html"),
    activeElement: null,
    getElementById: (id) => byKey(id),
    querySelector: (selector) => byKey(selector),
    querySelectorAll: (selector) => {
      const switcher = () => {
        const cv = byKey("doc-mode-cv"); cv.dataset.docMode = "cv";
        const letter = byKey("doc-mode-letter"); letter.dataset.docMode = "cover-letter";
        return [cv, letter];
      };
      // The real document also carries data-doc-mode on <body> as a CSS state marker,
      // so an unscoped "[data-doc-mode]" query returns the body too.
      if (selector === "[data-doc-mode]") return [byKey("body"), ...switcher()];
      if (selector.includes("button[data-doc-mode]")) return switcher();
      if (selector === "[data-view]") {
        return ["edit", "preview", "check"].map((view) => {
          const element = byKey(`view-${view}`);
          element.dataset.view = view;
          return element;
        });
      }
      if (selector === "[data-preview-mode]") {
        return ["preview", "check"].map((mode) => {
          const element = byKey(`preview-mode-${mode}`);
          element.dataset.previewMode = mode;
          return element;
        });
      }
      return [];
    },
    addEventListener() {},
  };
  globalThis.window = { addEventListener() {}, removeEventListener() {}, print() {}, setTimeout: () => 0 };
  globalThis.localStorage = {
    getItem: (key) => key === "cv-ats-generator:document:v1" ? stored : null,
    setItem() {}, removeItem() {},
  };
  globalThis.requestAnimationFrame = () => 0;
  globalThis.confirm = () => false;
  return byKey;
}

test("the browser entry module boots and renders every panel", async () => {
  const legacy = createSampleCV();
  delete legacy.coverLetter; // a document saved before the cover letter shipped
  const byKey = installDOM({ stored: JSON.stringify(legacy) });

  await import(`../js/editor-main.js?boot=${Date.now()}`);

  assert.equal(byKey("save-message").textContent, "Belum ada perubahan", "the boot placeholder must be replaced");
  assert.match(byKey("step-list").innerHTML, /class="step-button/, "CV steps must render");
  assert.match(byKey("editor-root").innerHTML, /class="editor-heading"/, "the editor must render");
  assert.match(byKey("preview-root").innerHTML, /class="cv-document/, "the A4 preview must render");
  assert.match(byKey("check-root").innerHTML, /class="ats-panel"/, "the check panel must render");
  assert.equal(byKey("body").dataset.docMode, undefined, "CV stays the default document at boot");
});

test("only the two switcher buttons listen for clicks, never the body", async () => {
  const byKey = installDOM();
  await import(`../js/editor-main.js?switcher=${Date.now()}`);

  assert.equal(byKey("body").listeners.has("click"), false,
    "a click listener on <body> would re-render the editor on every click and steal focus from the field being edited");
  assert.equal(byKey("doc-mode-cv").listeners.has("click"), true);
  assert.equal(byKey("doc-mode-letter").listeners.has("click"), true);
});

test("switching to the cover letter renders the letter form and its own check panel", async () => {
  const byKey = installDOM();
  await import(`../js/editor-main.js?letter=${Date.now()}`);

  byKey("doc-mode-letter").listeners.get("click")();

  assert.equal(byKey("body").dataset.docMode, "cover-letter");
  assert.match(byKey("editor-root").innerHTML, /data-path="coverLetter\.recipient"/, "the letter form must render");
  assert.match(byKey("preview-root").innerHTML, /letter-document/, "the preview must switch documents");
  assert.match(byKey("check-root").innerHTML, /Kesiapan Surat Lamaran/, "the letter check panel must render");
  assert.equal(byKey('[data-view="edit"]').textContent, "Isi Surat", "labels follow the active document");
});
