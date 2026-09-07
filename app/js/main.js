import { createEmptyCV, createSampleCV, isCVEmpty, normalizeCV } from "./model.js";
import { createLocalRepository } from "./storage.js";
import { createCVStore } from "./store.js";
import { downloadBackup, readBackupFile } from "./backup.js";

const byId = (id) => document.getElementById(id);
const elements = {
  saveState: byId("save-state"), saveMessage: byId("save-message"), notice: byId("notice"),
  title: byId("document-title"), locale: byId("document-locale"), metrics: byId("metrics"),
  sections: byId("section-list"), previewTitle: byId("preview-title"), previewOwner: byId("preview-owner"),
  updatedAt: byId("updated-at"), populatedCount: byId("populated-count"), sample: byId("sample-button"),
  clear: byId("clear-button"), export: byId("export-button"), import: byId("import-input"),
};

const sectionLabels = {
  summary: "Ringkasan", experience: "Pengalaman", education: "Pendidikan", skills: "Keterampilan",
  projects: "Proyek", certifications: "Sertifikasi", languages: "Bahasa", awards: "Penghargaan",
  volunteering: "Relawan",
};

let memoryDocument = null;
const memoryRepository = {
  load: () => memoryDocument,
  save: (value) => { memoryDocument = value; },
  clear: () => { memoryDocument = null; },
};

let repository;
let initialDocument;
let bootWarning = "";
try {
  repository = createLocalRepository();
  const stored = repository.load();
  initialDocument = stored ? normalizeCV(stored) : createEmptyCV();
} catch (error) {
  repository = memoryRepository;
  initialDocument = createEmptyCV();
  bootWarning = `${error.message} Perubahan hanya bertahan selama tab ini terbuka.`;
}

const store = createCVStore({ document: initialDocument, repository });

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function showNotice(message, type = "info") {
  elements.notice.hidden = !message;
  elements.notice.textContent = message;
  elements.notice.className = type === "error" ? "notice error" : "notice";
}

function populatedSections(cv) {
  return [
    cv.summary,
    cv.experience.length,
    cv.education.length,
    cv.skills.length,
    cv.projects.length,
    cv.certifications.length,
    cv.languages.length,
    cv.awards.length,
    cv.volunteering.length,
  ].filter(Boolean).length;
}

function render({ cv, save }) {
  if (document.activeElement !== elements.title) elements.title.value = cv.meta.title;
  if (document.activeElement !== elements.locale) elements.locale.value = cv.meta.locale;
  elements.saveState.dataset.status = save.status;
  elements.saveMessage.textContent = save.message;
  elements.previewTitle.textContent = cv.meta.title || "CV Baru";
  elements.previewOwner.textContent = cv.basics.fullName || "Belum ada nama kandidat";
  elements.updatedAt.textContent = formatDate(cv.meta.updatedAt);
  const count = populatedSections(cv);
  elements.populatedCount.textContent = String(count);

  const totals = {
    Pengalaman: cv.experience.length,
    Pendidikan: cv.education.length,
    Proyek: cv.projects.length,
    Sertifikasi: cv.certifications.length,
  };
  elements.metrics.innerHTML = Object.entries(totals).map(([label, value]) =>
    `<div class="metric"><strong>${value}</strong><span>${label}</span></div>`).join("");
  elements.sections.innerHTML = cv.settings.sectionOrder.map((key) => {
    const value = key === "summary" ? (cv.summary ? 1 : 0) : cv[key].length;
    const state = value ? `${value} terisi` : "Belum diisi";
    return `<div class="section-row"><strong>${sectionLabels[key]}</strong><span>${state}</span></div>`;
  }).join("");

  if (save.status === "error") showNotice(save.message, "error");
}

store.subscribe(render);
if (bootWarning) showNotice(bootWarning, "error");

elements.title.addEventListener("input", (event) => {
  store.update((cv) => { cv.meta.title = event.target.value; });
});

elements.locale.addEventListener("change", (event) => {
  store.update((cv) => { cv.meta.locale = event.target.value; });
});

elements.sample.addEventListener("click", () => {
  const current = store.getState().cv;
  if (!isCVEmpty(current) && !confirm("Ganti data saat ini dengan contoh? Unduh cadangan lebih dulu jika diperlukan.")) return;
  store.replace(createSampleCV());
  store.flush();
  showNotice("Data contoh dimuat dan disimpan di perangkat.");
});

elements.clear.addEventListener("click", () => {
  if (!confirm("Kosongkan seluruh data CV di browser ini? Tindakan ini tidak dapat dibatalkan tanpa cadangan JSON.")) return;
  store.replace(createEmptyCV());
  store.flush();
  showNotice("Data CV telah dikosongkan.");
});

elements.export.addEventListener("click", () => {
  try {
    downloadBackup(store.getState().cv);
    showNotice("Cadangan JSON berhasil dibuat.");
  } catch (error) {
    showNotice(`Cadangan gagal dibuat: ${error.message}`, "error");
  }
});

elements.import.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const restored = await readBackupFile(file);
    if (!confirm("Pulihkan cadangan ini dan ganti data CV yang sedang aktif?")) return;
    store.replace(restored);
    store.flush();
    showNotice("Cadangan berhasil dipulihkan.");
  } catch (error) {
    showNotice(error.message, "error");
  } finally {
    event.target.value = "";
  }
});

window.addEventListener("pagehide", () => store.flush());
