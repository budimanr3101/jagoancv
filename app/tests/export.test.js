import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createSampleCV } from "../js/model.js";
import { exportTextPDF, pdfFilename } from "../js/pdf-export.js";

function sample() {
  let id = 0;
  return createSampleCV({ idFactory: (prefix) => `${prefix}-${++id}`, now: () => new Date("2026-09-04T08:00:00Z") });
}

test("PDF filename uses candidate and target role safely", () => {
  assert.equal(pdfFilename(sample()), "dina-pratama-senior-cloud-engineer-cv.pdf");
});

test("PDF export prints semantic text and restores temporary document state", () => {
  const cv = sample();
  const root = { innerHTML: "", dataset: {} };
  const documentRef = { title: "SiapLamar", getElementById: (id) => id === "print-root" ? root : null };
  let printCalls = 0;
  let afterPrint;
  const windowRef = {
    addEventListener: (name, callback) => { if (name === "afterprint") afterPrint = callback; },
    print: () => { printCalls += 1; },
    setTimeout: () => 1,
  };
  const filename = exportTextPDF(cv, { documentRef, windowRef });
  assert.equal(filename, "dina-pratama-senior-cloud-engineer-cv.pdf");
  assert.equal(printCalls, 1);
  assert.equal(documentRef.title, "dina-pratama-senior-cloud-engineer-cv");
  assert.match(root.innerHTML, /<article class="cv-document/);
  assert.match(root.innerHTML, /Dina Pratama/);
  assert.match(root.innerHTML, /href="https:\/\//);
  assert.doesNotMatch(root.innerHTML, /<(?:table|canvas|img|header|footer)\b/i);
  afterPrint();
  assert.equal(documentRef.title, "SiapLamar");
  assert.equal(root.innerHTML, "");
});

test("print stylesheet defines A4, clean page breaks, and visible links", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(css, /@page\{size:A4;margin:0\}/);
  assert.match(css, /break-inside:avoid-page/);
  assert.match(css, /a\[href\]/);
  assert.match(css, /\.print-root\{display:block!important/);
});

test("application exposes PDF action and dedicated print root", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /id="pdf-button"/);
  assert.match(html, /id="print-root"/);
});
