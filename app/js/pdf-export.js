import { renderCVDocument, renderCoverLetterDocument } from "./preview.js";

function slug(value) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

export function pdfFilename(cv, kind = "cv") {
  const name = slug(cv.basics.fullName || "cv") || "cv";
  const role = slug(cv.targetJob.title || cv.basics.headline || "");
  // The filename travels with the document, so it follows the document language.
  const letterSuffix = cv.meta?.locale === "en" ? "cover-letter" : "surat-lamaran";
  const suffix = kind === "cover-letter" ? letterSuffix : "cv";
  return `${[name, role, suffix].filter(Boolean).join("-")}.pdf`;
}

export function exportTextPDF(cv, {
  documentRef = globalThis.document,
  windowRef = globalThis.window,
  kind = "cv",
  render = kind === "cover-letter" ? renderCoverLetterDocument : renderCVDocument,
} = {}) {
  const root = documentRef?.getElementById?.("print-root");
  if (!root || typeof windowRef?.print !== "function") {
    // Named so the view can translate it, the same way storage errors are handled.
    const error = new Error("Browser printing is not available.");
    error.name = "PrintUnavailableError";
    throw error;
  }
  const filename = pdfFilename(cv, kind);
  const originalTitle = documentRef.title;
  root.innerHTML = render(cv, "");
  root.dataset.filename = filename;
  documentRef.title = filename.replace(/\.pdf$/i, "");

  let restored = false;
  const restore = () => {
    if (restored) return;
    restored = true;
    documentRef.title = originalTitle;
    root.innerHTML = "";
    delete root.dataset.filename;
  };
  windowRef.addEventListener?.("afterprint", restore, { once: true });
  windowRef.print();
  windowRef.setTimeout?.(restore, 1500);
  return filename;
}
