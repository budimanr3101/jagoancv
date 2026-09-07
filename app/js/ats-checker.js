import { analyzeBullet } from "./completeness.js";
import { fill } from "./editor-copy.js";

const severityOrder = { error: 0, warning: 1, recommendation: 2, info: 3 };
const requiredSections = ["summary", "experience", "education", "skills"];
const allowedSections = ["summary", "experience", "education", "skills", "projects", "certifications", "languages", "awards", "volunteering"];
const allowedHeadings = new Set([
  "Ringkasan Profesional", "Pengalaman Kerja", "Pendidikan", "Keterampilan", "Proyek", "Sertifikasi", "Bahasa", "Penghargaan", "Pengalaman Relawan",
  "Professional Summary", "Work Experience", "Education", "Skills", "Projects", "Certifications", "Languages", "Awards", "Volunteer Experience",
]);
const acronymExpansions = {
  AWS: "Amazon Web Services", EKS: "Elastic Kubernetes Service", IaC: "Infrastructure as Code",
  "CI/CD": "Continuous Integration and Continuous Delivery",
};

// One entry per distinct message. Several findings share an ATS id (ATS-005 has four
// variants, ATS-007 five), so copy is keyed by a stable code instead of by id.
const CHECK_COPY = Object.freeze({
  id: {
    documentUnknown: { title: "Dokumen utama tidak dikenali", message: "Preview harus memiliki satu dokumen teks utama yang jelas." },
    forbiddenElements: { title: "Elemen berisiko parsing ditemukan", message: "Hapus elemen berikut dari template ATS: {list}." },
    multiColumn: { title: "Layout berpotensi multikolom", message: "Gunakan alur dokumen satu kolom untuk menjaga urutan baca." },
    hiddenText: { title: "Teks tersembunyi ditemukan", message: "Template ATS tidak boleh menyembunyikan keyword atau konten." },
    customHeadings: { title: "Heading bagian tidak standar", message: "Gunakan heading standar untuk: {list}." },
    nameMissing: { title: "Nama lengkap belum ada", message: "Tambahkan nama yang harus dilihat recruiter." },
    nameSpacing: { title: "Spasi nama tidak konsisten", message: "Gunakan spasi biasa agar nama tidak terpecah saat diekstrak." },
    contactMissing: { title: "Informasi kontak belum ada", message: "Tambahkan email dan nomor telepon yang aktif." },
    emailMissing: { title: "Email belum diisi", message: "Email profesional memudahkan recruiter menghubungi Anda." },
    phoneMissing: { title: "Nomor telepon belum diisi", message: "Tambahkan nomor telepon dengan kode negara bila melamar lintas negara." },
    summaryEmpty: { title: "Ringkasan profesional kosong", message: "Tambahkan ringkasan singkat yang sesuai posisi tujuan." },
    summaryShort: { title: "Ringkasan terlalu singkat", message: "Sebutkan bidang, pengalaman, keahlian utama, dan nilai yang Anda berikan." },
    summaryLong: { title: "Ringkasan terlalu panjang", message: "Ringkas menjadi sekitar 300–500 karakter agar mudah dipindai." },
    evidenceMissing: { title: "Belum ada bukti pengalaman", message: "Tambahkan pengalaman kerja, proyek, atau pengalaman relawan yang relevan." },
    startDateMissing: { title: "Tanggal mulai belum lengkap", message: "Lengkapi tanggal mulai pada entri {collection}." },
    startDateFormat: { title: "Format tanggal mulai tidak konsisten", message: "Gunakan bulan dan tahun yang valid." },
    endDateFormat: { title: "Format tanggal selesai tidak konsisten", message: "Gunakan bulan dan tahun yang valid." },
    dateReversed: { title: "Rentang tanggal terbalik", message: "Tanggal selesai tidak boleh mendahului tanggal mulai." },
    currentWithEndDate: { title: "Entri aktif masih memiliki tanggal selesai", message: "Kosongkan tanggal selesai atau nonaktifkan status pekerjaan saat ini." },
    bulletWeak: { title: "Bullet belum menunjukkan dampak terukur", message: "{suggestions}" },
    bulletLong: { title: "Bullet terlalu panjang", message: "Pecah atau ringkas bullet agar mudah dipindai recruiter." },
    skillsUnsupported: { title: "Sebagian keterampilan belum memiliki bukti", message: "Tunjukkan penggunaan {list} dalam pengalaman atau proyek jika memang relevan." },
    acronym: { title: "Perluas singkatan {acronym} satu kali", message: "Tulis “{expansion} ({acronym})” pada penyebutan pertama bila akurat." },
    unsafeLink: { title: "Tautan tidak valid atau tidak aman", message: "Gunakan URL lengkap yang diawali https://." },
    sectionOrderInvalid: { title: "Urutan bagian tidak valid", message: "Pulihkan urutan bagian standar sebelum ekspor." },
    sectionsMissing: { title: "Bagian utama hilang dari urutan", message: "Tambahkan kembali: {list}." },
    templateUnsafe: { title: "Template tidak termasuk ATS-safe", message: "Gunakan template Bersih Sans standar." },
    auditLayout: "Satu kolom dengan urutan linear",
    auditText: "Informasi utama berupa teks asli",
    auditHeadings: "Heading bagian memakai istilah standar",
    auditBody: "Kontak berada di badan dokumen",
    auditTheme: "Template Bersih Sans aktif",
    collections: { experience: "pengalaman", education: "pendidikan", projects: "proyek", volunteering: "pengalaman relawan" },
  },
  en: {
    documentUnknown: { title: "The main document was not recognised", message: "The preview must contain one clear main text document." },
    forbiddenElements: { title: "Elements that risk parsing were found", message: "Remove these elements from an ATS template: {list}." },
    multiColumn: { title: "The layout may be multi-column", message: "Use a single-column document flow to keep the reading order intact." },
    hiddenText: { title: "Hidden text was found", message: "An ATS template must never hide keywords or content." },
    customHeadings: { title: "Non-standard section headings", message: "Use standard headings for: {list}." },
    nameMissing: { title: "No full name yet", message: "Add the name the recruiter needs to see." },
    nameSpacing: { title: "Inconsistent spacing in the name", message: "Use ordinary spaces so the name is not split during extraction." },
    contactMissing: { title: "No contact details yet", message: "Add a working email address and phone number." },
    emailMissing: { title: "No email address yet", message: "A professional email address makes it easier for recruiters to reach you." },
    phoneMissing: { title: "No phone number yet", message: "Include the country code when you apply across borders." },
    summaryEmpty: { title: "The professional summary is empty", message: "Add a short summary that fits the role you want." },
    summaryShort: { title: "The summary is too short", message: "Mention your field, your experience, your core skills, and the value you bring." },
    summaryLong: { title: "The summary is too long", message: "Trim it to roughly 300–500 characters so it stays scannable." },
    evidenceMissing: { title: "No evidence of experience yet", message: "Add relevant roles, projects, or volunteer experience." },
    startDateMissing: { title: "An incomplete start date", message: "Complete the start date on a {collection} entry." },
    startDateFormat: { title: "Inconsistent start date format", message: "Use a valid month and year." },
    endDateFormat: { title: "Inconsistent end date format", message: "Use a valid month and year." },
    dateReversed: { title: "The date range is reversed", message: "The end date cannot come before the start date." },
    currentWithEndDate: { title: "A current entry still has an end date", message: "Clear the end date or turn off the current-role setting." },
    bulletWeak: { title: "This bullet shows no measurable impact yet", message: "{suggestions}" },
    bulletLong: { title: "The bullet is too long", message: "Split or trim the bullet so a recruiter can scan it." },
    skillsUnsupported: { title: "Some skills have no evidence yet", message: "Show where you used {list} in your experience or projects, when that is genuinely true." },
    acronym: { title: "Expand {acronym} once", message: "Write “{expansion} ({acronym})” on first mention when accurate." },
    unsafeLink: { title: "An invalid or unsafe link", message: "Use a full URL that starts with https://." },
    sectionOrderInvalid: { title: "The section order is not valid", message: "Restore the standard section order before exporting." },
    sectionsMissing: { title: "Core sections are missing from the order", message: "Add these back: {list}." },
    templateUnsafe: { title: "The template is not on the ATS-safe list", message: "Use the standard Clean Sans template." },
    auditLayout: "Single column with a linear order",
    auditText: "Key information is real text",
    auditHeadings: "Section headings use standard terms",
    auditBody: "Contact details sit in the document body",
    auditTheme: "The Clean Sans template is active",
    collections: { experience: "experience", education: "education", projects: "project", volunteering: "volunteer" },
  },
});

const copyFor = (language) => CHECK_COPY[language] ?? CHECK_COPY.id;

const text = (value) => typeof value === "string" ? value.trim() : "";
const wordCount = (value) => text(value).split(/\s+/).filter(Boolean).length;
const validMonth = (value) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value ?? "");

// `code` is the stable, language-independent identity of a message. Anything that
// reasons about a finding must test the code, never the translated prose.
function makeFinding(copy, code, id, severity, category, vars = {}, extra = {}) {
  const entry = copy[code] ?? CHECK_COPY.id[code];
  return {
    id, code, severity, category,
    title: fill(entry.title, vars),
    message: fill(entry.message, vars),
    ...extra,
  };
}

function allVisibleText(cv, { includeSkills = true } = {}) {
  const values = [cv.basics.fullName, cv.basics.headline, cv.basics.email, cv.basics.phone, cv.basics.location, cv.summary];
  cv.basics.links.forEach((entry) => values.push(entry.label, entry.url));
  for (const entry of cv.experience) values.push(entry.role, entry.organization, entry.location, ...entry.bullets);
  for (const entry of cv.education) values.push(entry.qualification, entry.field, entry.institution, entry.location, ...entry.bullets);
  for (const entry of cv.projects) values.push(entry.name, entry.role, entry.url, ...entry.bullets);
  for (const entry of cv.certifications) values.push(entry.name, entry.issuer, entry.credentialId);
  if (includeSkills) for (const entry of cv.skills) values.push(entry.name, ...entry.items);
  for (const entry of cv.languages) values.push(entry.name, entry.proficiency);
  for (const entry of cv.awards) values.push(entry.title, entry.issuer, entry.description);
  for (const entry of cv.volunteering) values.push(entry.role, entry.organization, ...entry.bullets);
  return values.filter(Boolean).join(" ");
}

function unsafeUrl(value) {
  if (!text(value)) return false;
  try { return !["http:", "https:"].includes(new URL(value).protocol); }
  catch { return true; }
}

export function auditPreviewMarkup(markup, language = "id") {
  const copy = copyFor(language);
  const add = (code, id, severity, category, vars) => makeFinding(copy, code, id, severity, category, vars);
  const findings = [];
  if (!/<article\b[^>]*class=["'][^"']*cv-document/i.test(markup)) {
    findings.push(add("documentUnknown", "ATS-003", "error", "structure"));
  }
  const forbidden = [...markup.matchAll(/<(table|img|canvas|svg|header|footer)\b/gi)].map((match) => match[1].toLowerCase());
  if (forbidden.length) {
    findings.push(add("forbiddenElements", "ATS-005", "error", "structure", { list: [...new Set(forbidden)].join(", ") }));
  }
  if (/column-count|grid-template-columns|display\s*:\s*grid/i.test(markup)) {
    findings.push(add("multiColumn", "ATS-005", "error", "structure"));
  }
  if (/display\s*:\s*none|visibility\s*:\s*hidden|font-size\s*:\s*0/i.test(markup)) {
    findings.push(add("hiddenText", "ATS-005", "error", "structure"));
  }
  const headings = [...markup.matchAll(/<h2\b[^>]*>(.*?)<\/h2>/gis)].map((match) => match[1].replace(/<[^>]+>/g, "").trim());
  const custom = headings.filter((heading) => !allowedHeadings.has(heading));
  if (custom.length) {
    findings.push(add("customHeadings", "ATS-008", "warning", "headings", { list: custom.join(", ") }));
  }
  return findings;
}

export function evaluateTemplateSafety(markup, theme, language = "id") {
  const copy = copyFor(language);
  const audit = auditPreviewMarkup(markup, language);
  const checks = [
    { id: "layout", label: copy.auditLayout, pass: !audit.some((entry) => entry.code === "multiColumn" || entry.code === "documentUnknown") },
    { id: "text", label: copy.auditText, pass: !/<(?:img|canvas|svg)\b/i.test(markup) },
    { id: "headings", label: copy.auditHeadings, pass: !audit.some((entry) => entry.id === "ATS-008") },
    { id: "body", label: copy.auditBody, pass: !/<(?:header|footer)\b/i.test(markup) },
    { id: "theme", label: copy.auditTheme, pass: theme === "clean-sans" },
  ];
  return { safe: checks.every((entry) => entry.pass), checks, findings: audit };
}

export function runATSChecks(cv, { previewHTML = "", language = "id" } = {}) {
  const copy = copyFor(language);
  const results = [];
  const add = (code, id, severity, category, vars = {}, extra = {}) =>
    results.push(makeFinding(copy, code, id, severity, category, vars, extra));

  if (!text(cv.basics.fullName)) add("nameMissing", "ATS-001", "error", "contact", {}, { step: "basics", path: "basics.fullName" });
  if (!text(cv.basics.email) && !text(cv.basics.phone)) {
    add("contactMissing", "ATS-002", "error", "contact", {}, { step: "basics" });
  } else {
    if (!text(cv.basics.email)) add("emailMissing", "ATS-002", "warning", "contact", {}, { step: "basics", path: "basics.email" });
    if (!text(cv.basics.phone)) add("phoneMissing", "ATS-002", "warning", "contact", {}, { step: "basics", path: "basics.phone" });
  }
  if (/\s{2,}/.test(cv.basics.fullName)) add("nameSpacing", "ATS-001", "warning", "contact", {}, { step: "basics", path: "basics.fullName" });

  if (!text(cv.summary)) add("summaryEmpty", "ATS-009", "warning", "content", {}, { step: "summary" });
  else if (cv.summary.length < 60) add("summaryShort", "ATS-009", "warning", "content", {}, { step: "summary" });
  else if (cv.summary.length > 700) add("summaryLong", "ATS-009", "warning", "content", {}, { step: "summary" });

  if (!cv.experience.length && !cv.projects.length && !cv.volunteering.length) {
    add("evidenceMissing", "ATS-006", "warning", "evidence", {}, { step: "experience" });
  }

  const datedCollections = [
    ["experience", "experience"], ["education", "education"], ["projects", "extras"], ["volunteering", "extras"],
  ];
  for (const [key, step] of datedCollections) {
    const collection = copy.collections[key] ?? key;
    cv[key].forEach((entry) => {
      if (!text(entry.startDate)) add("startDateMissing", "ATS-007", "warning", "dates", { collection }, { step, path: `${key}.${entry.id}.startDate` });
      else if (!validMonth(entry.startDate)) add("startDateFormat", "ATS-007", "warning", "dates", {}, { step, path: `${key}.${entry.id}.startDate` });
      if (!entry.current && entry.endDate && !validMonth(entry.endDate)) add("endDateFormat", "ATS-007", "warning", "dates", {}, { step, path: `${key}.${entry.id}.endDate` });
      if (entry.startDate && entry.endDate && entry.endDate < entry.startDate) add("dateReversed", "ATS-007", "error", "dates", {}, { step, path: `${key}.${entry.id}.endDate` });
      if (entry.current && entry.endDate) add("currentWithEndDate", "ATS-007", "warning", "dates", {}, { step });
    });
  }

  const bullets = [...cv.experience.flatMap((entry) => entry.bullets.map((value) => ({ value, step: "experience" }))), ...cv.projects.flatMap((entry) => entry.bullets.map((value) => ({ value, step: "extras" })))];
  bullets.forEach(({ value, step }, index) => {
    const analysis = analyzeBullet(value, language);
    if (!analysis.strong && index < 5) add("bulletWeak", "ATS-010", "recommendation", "writing", { suggestions: analysis.suggestions.join(" ") }, { step });
    if (wordCount(value) > 45) add("bulletLong", "ATS-010", "recommendation", "writing", {}, { step });
  });

  const evidenceText = allVisibleText(cv, { includeSkills: false }).toLowerCase();
  const unsupported = cv.skills.flatMap((group) => group.items).filter((skill) => text(skill) && !evidenceText.includes(skill.toLowerCase())).slice(0, 5);
  if (unsupported.length) add("skillsUnsupported", "ATS-011", "recommendation", "evidence", { list: unsupported.join(", ") }, { step: "skills" });

  const visibleText = allVisibleText(cv);
  for (const [acronym, expansion] of Object.entries(acronymExpansions)) {
    const pattern = new RegExp(`(^|[^A-Za-z])${acronym.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^A-Za-z]|$)`, "i");
    if (pattern.test(visibleText) && !visibleText.toLowerCase().includes(expansion.toLowerCase())) {
      add("acronym", "ATS-013", "recommendation", "keywords", { acronym, expansion }, { step: "summary" });
    }
  }

  const urls = [...cv.basics.links.map((entry) => entry.url), ...cv.projects.map((entry) => entry.url), ...cv.certifications.map((entry) => entry.url)];
  if (urls.some(unsafeUrl)) add("unsafeLink", "ATS-012", "warning", "links", {}, { step: "basics" });

  const order = cv.settings.sectionOrder;
  const unknown = order.filter((key) => !allowedSections.includes(key));
  const duplicates = order.filter((key, index) => order.indexOf(key) !== index);
  const missing = requiredSections.filter((key) => !order.includes(key));
  if (unknown.length || duplicates.length) add("sectionOrderInvalid", "ATS-008", "error", "headings");
  if (missing.length) add("sectionsMissing", "ATS-008", "warning", "headings", { list: missing.join(", ") });

  if (cv.settings.theme !== "clean-sans") add("templateUnsafe", "ATS-005", "error", "structure");
  if (previewHTML) results.push(...auditPreviewMarkup(previewHTML, language));

  const deduped = [...new Map(results.map((entry, index) => [`${entry.id}:${entry.code}:${entry.path ?? index}`, entry])).values()];
  return deduped.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

export function summarizeATSFindings(findings) {
  return {
    errors: findings.filter((entry) => entry.severity === "error").length,
    warnings: findings.filter((entry) => entry.severity === "warning").length,
    recommendations: findings.filter((entry) => entry.severity === "recommendation").length,
  };
}
