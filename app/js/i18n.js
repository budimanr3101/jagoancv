export const LANGUAGE_STORAGE_KEY = "cv-ats-generator:language";
export const LANGUAGES = Object.freeze(["id", "en"]);
export const DEFAULT_LANGUAGE = "id";

// Interface copy only. Never put candidate content or sample data here: the
// document language is a separate, per-document setting.
export const DICTIONARIES = Object.freeze({
  id: {
    "brand.tagline": "CV ATS Generator",
    "brand.home": "SiapLamar beranda",
    "app.title": "SiapLamar — Generator CV ATS",
    "print.unavailable": "Fitur print browser tidak tersedia.",
    "doc.cv": "CV",
    "doc.letter": "Surat Lamaran",
    "doc.group": "Dokumen aktif",
    "action.exportPdf": "Ekspor PDF",
    "action.settings": "Setelan",
    "action.sample": "Isi contoh",
    "action.sampleLanguage": "Bahasa contoh",
    "action.clear": "Kosongkan",
    "settings.appLanguage": "Bahasa aplikasi",
    "settings.documentLanguage": "Bahasa dokumen",
    "settings.theme": "Tema",
    "theme.system": "Sistem",
    "theme.light": "Terang",
    "theme.dark": "Gelap",
    "language.id": "Indonesia",
    "language.en": "English",
    "view.nav": "Tampilan aplikasi",
    "view.editCv": "Isi CV",
    "view.editLetter": "Isi Surat",
    "view.preview": "Preview",
    "view.check": "Pemeriksaan",
    "panel.mode": "Mode panel kanan",
    "panel.cv": "Preview dan pemeriksaan CV",
    "panel.letter": "Preview dan pemeriksaan Surat Lamaran",
    "workspace.cv": "Editor CV",
    "workspace.letter": "Editor Surat Lamaran",
    "steps.aria": "Tahapan pembuatan CV",
    "steps.completeness": "Kelengkapan",
    "steps.startHint": "Mulai dari data diri",
    "privacy.title": "Privat secara default",
    "privacy.body": "Data tersimpan di browser ini dan tidak dikirim ke server.",
    "letterGuide.title": "Urutan surat",
    "letterGuide.step1": "Penerima, kota, dan tanggal",
    "letterGuide.step2": "Sapaan",
    "letterGuide.step3": "Alasan melamar",
    "letterGuide.step4": "Bukti pengalaman dengan angka",
    "letterGuide.step5": "Penutup dan nama",
    "letterGuide.note": "Nama, posisi, dan perusahaan diambil otomatis dari CV serta panel Sesuai lowongan.",
    "support.aria": "Thanks to me melalui Saweria, terbuka di tab baru",
    "support.via": "via Saweria",
    "noscript": "Aplikasi membutuhkan JavaScript untuk mengedit dan menyimpan CV secara lokal.",
    "save.idle": "Belum ada perubahan",
    "save.pending": "Menyimpan…",
    "save.saved": "Tersimpan di perangkat",
    "save.full": "Penyimpanan browser penuh. Kosongkan data yang tidak diperlukan sebelum melanjutkan.",
    "save.blocked": "Penyimpanan browser tidak dapat diakses.",
    "save.corrupt": "Data lokal rusak dan tidak dapat dibaca.",
    "save.sessionOnly": "Perubahan hanya bertahan selama tab ini terbuka.",
    "step.active": "Sedang diisi",
    "step.done": "Selesai",
    "step.incomplete": "Belum lengkap",
    "step.errors": "{count} perlu diperbaiki",
    "steps.progress": "{done} dari {total} kebutuhan utama terpenuhi",
    "notice.sampleLoaded": "Data contoh dimuat dan disimpan di perangkat.",
    "notice.cleared": "Data CV telah dikosongkan.",
    "notice.printOpened": "Dialog print dibuka untuk {document}. Pilih “Save as PDF” dengan nama {filename}.",
    "notice.printFailed": "PDF gagal disiapkan: {message}",
    "confirm.sample": "Ganti data saat ini dengan contoh? Data yang sedang diisi akan ditimpa.",
    "confirm.clear": "Kosongkan seluruh data CV di browser ini? Tindakan ini tidak dapat dibatalkan.",
    "confirm.removeEntry": "Hapus entri ini?",
    "document.cv": "CV",
    "document.letter": "Surat lamaran",
    "checker.kicker": "Pemeriksaan transparan",
    "checker.errors": "Error",
    "checker.warnings": "Warning",
    "checker.suggestions": "Saran",
    "checker.fixFirst": "Perbaiki dulu",
    "checker.suggested": "Disarankan",
    "checker.openSection": "Buka bagian",
    "checker.pass": "Lulus",
    "checker.fail": "Belum",
    "severity.error": "Perbaiki dulu",
    "severity.warning": "Perlu ditinjau",
    "severity.recommendation": "Disarankan",
    "severity.info": "Informasi",
    "letterPanel.title": "Kesiapan Surat Lamaran",
    "letterPanel.intro": "Memeriksa kelengkapan, panjang, dan keterkaitan surat dengan lowongan. Skor kesiapan 0–100 hanya berlaku untuk CV dan sengaja tidak dihitung di sini.",
    "letterPanel.sizeKicker": "Ukuran surat",
    "letterPanel.words": "{count} kata",
    "letterPanel.ideal": "Panjang ideal",
    "letterPanel.tooShort": "Terlalu pendek",
    "letterPanel.tooLong": "Terlalu panjang",
    "letterPanel.noBody": "Belum ada isi",
    "letterPanel.rowParagraphs": "{count} paragraf (disarankan 3)",
    "letterPanel.rowWords": "{count} kata (target {min}–{max})",
    "letterPanel.rowNumbers": "Memuat bukti berupa angka",
    "letterPanel.rowCityDate": "Kota dan tanggal lengkap",
    "letterPanel.noFindings": "Tidak ada error atau warning pada surat ini.",
    "letterPanel.noSuggestions": "Tidak ada saran tambahan saat ini.",
    "keyword.kicker": "Sesuai lowongan",
    "keyword.title": "Keyword coverage",
    "keyword.disclaimer": "bukan skor ATS universal",
    "keyword.note": "Analisis berjalan hanya di browser. Tambahkan keyword ke {subject} hanya jika benar-benar sesuai pengalaman Anda.",
    "keyword.targetRole": "Posisi target",
    "keyword.company": "Perusahaan",
    "keyword.companyPlaceholder": "Opsional",
    "keyword.description": "Deskripsi lowongan",
    "keyword.descriptionPlaceholder": "Tempel deskripsi lowongan di sini. Data tidak dikirim ke server.",
    "keyword.descriptionHelp": "Analisis lokal mendeteksi istilah berulang dan istilah teknis; selalu tinjau relevansinya secara manual.",
    "keyword.presentGroup": "Sudah ada",
    "keyword.missingGroup": "Perlu ditinjau",
    "keyword.present": "Sudah ada di {subject}",
    "keyword.notFound": "Belum ditemukan",
    "keyword.dismissedState": "Diabaikan",
    "keyword.dismiss": "Abaikan",
    "keyword.restore": "Pulihkan",
    "keyword.noneMatched": "Belum ada keyword yang cocok.",
    "keyword.noneMissing": "Tidak ada keyword relevan yang hilang.",
    "keyword.dismissedGroup": "Keyword diabaikan ({count})",
    "keyword.emptyTitle": "Belum ada deskripsi lowongan",
    "keyword.emptyBody": "Tempel lowongan untuk membandingkan terminologi secara lokal.",
    "subject.cv": "CV",
    "subject.letter": "surat",
    "score.kicker": "Skor kesiapan internal",
    "score.disclaimer": "Mengukur struktur, kelengkapan, kualitas konten, dan konsistensi. Bukan skor resmi Workday, Greenhouse, atau vendor ATS lain. Keyword Coverage dihitung terpisah.",
    "score.method": "Lihat cara perhitungan",
    "atsPanel.title": "Kesiapan ATS",
    "atsPanel.intro": "Temuan berikut memeriksa keterbacaan dan kelengkapan umum. Tidak ada alat yang dapat menjamin lolos semua ATS atau mendapat interview.",
    "atsPanel.templateKicker": "Template aktif",
    "atsPanel.structureSafe": "Struktur aman",
    "atsPanel.structureFix": "Perlu diperbaiki",
    "atsPanel.noFindings": "Tidak ada error atau warning struktur yang terdeteksi.",
    "atsPanel.noSuggestions": "Tidak ada saran tambahan saat ini.",
    "template.cleanSans": "Bersih Sans",
  },
  en: {
    "brand.tagline": "ATS CV Generator",
    "brand.home": "SiapLamar home",
    "app.title": "SiapLamar — ATS CV Generator",
    "print.unavailable": "Browser printing is not available.",
    "doc.cv": "CV",
    "doc.letter": "Cover Letter",
    "doc.group": "Active document",
    "action.exportPdf": "Export PDF",
    "action.settings": "Settings",
    "action.sample": "Load sample",
    "action.sampleLanguage": "Sample language",
    "action.clear": "Clear",
    "settings.appLanguage": "App language",
    "settings.documentLanguage": "Document language",
    "settings.theme": "Theme",
    "theme.system": "System",
    "theme.light": "Light",
    "theme.dark": "Dark",
    "language.id": "Indonesian",
    "language.en": "English",
    "view.nav": "Application view",
    "view.editCv": "Edit CV",
    "view.editLetter": "Edit letter",
    "view.preview": "Preview",
    "view.check": "Checks",
    "panel.mode": "Right panel mode",
    "panel.cv": "CV preview and checks",
    "panel.letter": "Cover letter preview and checks",
    "workspace.cv": "CV editor",
    "workspace.letter": "Cover letter editor",
    "steps.aria": "CV building steps",
    "steps.completeness": "Completeness",
    "steps.startHint": "Start with your details",
    "privacy.title": "Private by default",
    "privacy.body": "Your data stays in this browser and is never sent to a server.",
    "letterGuide.title": "Letter order",
    "letterGuide.step1": "Recipient, city, and date",
    "letterGuide.step2": "Greeting",
    "letterGuide.step3": "Why you are applying",
    "letterGuide.step4": "Evidence with numbers",
    "letterGuide.step5": "Closing and your name",
    "letterGuide.note": "Your name, the role, and the company are pulled from the CV and the job-match panel.",
    "support.aria": "Thanks to me via Saweria, opens in a new tab",
    "support.via": "via Saweria",
    "noscript": "This application needs JavaScript to edit and store your CV locally.",
    "save.idle": "No changes yet",
    "save.pending": "Saving…",
    "save.saved": "Saved on this device",
    "save.full": "Browser storage is full. Remove data you no longer need before continuing.",
    "save.blocked": "Browser storage cannot be accessed.",
    "save.corrupt": "The local data is damaged and cannot be read.",
    "save.sessionOnly": "Changes will only last while this tab stays open.",
    "step.active": "In progress",
    "step.done": "Done",
    "step.incomplete": "Incomplete",
    "step.errors": "{count} need fixing",
    "steps.progress": "{done} of {total} essentials completed",
    "notice.sampleLoaded": "Sample data loaded and saved on this device.",
    "notice.cleared": "The CV data has been cleared.",
    "notice.printOpened": "The print dialog is open for the {document}. Choose “Save as PDF” with the name {filename}.",
    "notice.printFailed": "The PDF could not be prepared: {message}",
    "confirm.sample": "Replace the current data with the sample? Anything you have written will be overwritten.",
    "confirm.clear": "Clear all CV data in this browser? This cannot be undone.",
    "confirm.removeEntry": "Remove this entry?",
    "document.cv": "CV",
    "document.letter": "cover letter",
    "checker.kicker": "Transparent checks",
    "checker.errors": "Errors",
    "checker.warnings": "Warnings",
    "checker.suggestions": "Suggestions",
    "checker.fixFirst": "Fix first",
    "checker.suggested": "Suggested",
    "checker.openSection": "Open section",
    "checker.pass": "Pass",
    "checker.fail": "Not yet",
    "severity.error": "Fix first",
    "severity.warning": "Needs review",
    "severity.recommendation": "Suggested",
    "severity.info": "Info",
    "letterPanel.title": "Cover Letter Readiness",
    "letterPanel.intro": "Checks the letter's completeness, length, and link to the vacancy. The 0–100 readiness score applies to the CV only and is deliberately not calculated here.",
    "letterPanel.sizeKicker": "Letter size",
    "letterPanel.words": "{count} words",
    "letterPanel.ideal": "Ideal length",
    "letterPanel.tooShort": "Too short",
    "letterPanel.tooLong": "Too long",
    "letterPanel.noBody": "No body yet",
    "letterPanel.rowParagraphs": "{count} paragraphs (3 recommended)",
    "letterPanel.rowWords": "{count} words (target {min}–{max})",
    "letterPanel.rowNumbers": "Contains evidence with numbers",
    "letterPanel.rowCityDate": "City and date complete",
    "letterPanel.noFindings": "No errors or warnings on this letter.",
    "letterPanel.noSuggestions": "No further suggestions right now.",
    "keyword.kicker": "Job match",
    "keyword.title": "Keyword coverage",
    "keyword.disclaimer": "not a universal ATS score",
    "keyword.note": "The analysis runs in your browser only. Add a keyword to the {subject} only when it genuinely matches your experience.",
    "keyword.targetRole": "Target role",
    "keyword.company": "Company",
    "keyword.companyPlaceholder": "Optional",
    "keyword.description": "Job description",
    "keyword.descriptionPlaceholder": "Paste the job description here. Nothing is sent to a server.",
    "keyword.descriptionHelp": "The local analysis detects repeated and technical terms; always review how relevant they are yourself.",
    "keyword.presentGroup": "Present",
    "keyword.missingGroup": "To review",
    "keyword.present": "Already in the {subject}",
    "keyword.notFound": "Not found",
    "keyword.dismissedState": "Dismissed",
    "keyword.dismiss": "Dismiss",
    "keyword.restore": "Restore",
    "keyword.noneMatched": "No keywords match yet.",
    "keyword.noneMissing": "No relevant keywords are missing.",
    "keyword.dismissedGroup": "Dismissed keywords ({count})",
    "keyword.emptyTitle": "No job description yet",
    "keyword.emptyBody": "Paste a vacancy to compare terminology locally.",
    "subject.cv": "CV",
    "subject.letter": "letter",
    "score.kicker": "Internal readiness score",
    "score.disclaimer": "It measures structure, completeness, content quality, and consistency. It is not an official Workday, Greenhouse, or any other ATS vendor score. Keyword coverage is counted separately.",
    "score.method": "See how it is calculated",
    "atsPanel.title": "ATS Readiness",
    "atsPanel.intro": "These findings check general readability and completeness. No tool can guarantee passing every ATS or landing an interview.",
    "atsPanel.templateKicker": "Active template",
    "atsPanel.structureSafe": "Structure is safe",
    "atsPanel.structureFix": "Needs fixing",
    "atsPanel.noFindings": "No structural errors or warnings detected.",
    "atsPanel.noSuggestions": "No further suggestions right now.",
    "template.cleanSans": "Clean Sans",
  },
});

export function normalizeLanguage(value) {
  return LANGUAGES.includes(value) ? value : DEFAULT_LANGUAGE;
}

function browserStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function readLanguage(storage = browserStorage()) {
  try {
    return normalizeLanguage(storage?.getItem(LANGUAGE_STORAGE_KEY));
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export function persistLanguage(storage, language) {
  const normalized = normalizeLanguage(language);
  try {
    if (normalized === DEFAULT_LANGUAGE) storage?.removeItem(LANGUAGE_STORAGE_KEY);
    else storage?.setItem(LANGUAGE_STORAGE_KEY, normalized);
  } catch {
    // Switching languages must keep working when browser storage is unavailable.
  }
  return normalized;
}

// A missing key falls back to Indonesian, then to the key itself, so a partially
// translated build degrades to readable text instead of blanks.
export function translator(language = DEFAULT_LANGUAGE) {
  const active = DICTIONARIES[normalizeLanguage(language)];
  const fallback = DICTIONARIES[DEFAULT_LANGUAGE];
  return (key, vars) => {
    const template = active[key] ?? fallback[key] ?? key;
    if (!vars) return template;
    return template.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
  };
}

export function applyStaticTranslations(t, root = globalThis.document) {
  if (!root?.querySelectorAll) return;
  for (const node of root.querySelectorAll("[data-i18n]")) {
    node.textContent = t(node.dataset.i18n);
  }
  for (const node of root.querySelectorAll("[data-i18n-aria]")) {
    node.setAttribute("aria-label", t(node.dataset.i18nAria));
  }
}

export function setupLanguageControl({
  select = globalThis.document?.getElementById("language-select"),
  root = globalThis.document?.documentElement,
  storage = browserStorage(),
  windowRef = globalThis.window,
  onChange = () => {},
} = {}) {
  let current = readLanguage(storage);
  const apply = () => {
    if (root) root.lang = current;
    if (select) select.value = current;
    onChange(current);
  };
  apply();

  const handleChange = (event) => {
    current = persistLanguage(storage, event.target.value);
    apply();
  };
  const handleStorage = (event) => {
    if (event.key !== LANGUAGE_STORAGE_KEY && event.key !== null) return;
    current = normalizeLanguage(event.newValue);
    apply();
  };

  select?.addEventListener("change", handleChange);
  windowRef?.addEventListener?.("storage", handleStorage);

  return {
    get language() { return current; },
    destroy() {
      select?.removeEventListener("change", handleChange);
      windowRef?.removeEventListener?.("storage", handleStorage);
    },
  };
}
