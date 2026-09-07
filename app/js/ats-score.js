import { evaluateTemplateSafety } from "./ats-checker.js";
import { analyzeBullet } from "./completeness.js";

export const ATS_SCORE_WEIGHTS = Object.freeze({ structure: 35, completeness: 25, content: 25, consistency: 15 });

const SCORE_COPY = Object.freeze({
  id: {
    structure: "Struktur ATS",
    "structure-layout": "Dokumen satu kolom dan linear",
    "structure-text": "Informasi utama berupa teks asli",
    "structure-headings": "Heading bagian standar",
    "structure-contact": "Kontak berada di badan dokumen",
    "structure-theme": "Template termasuk daftar ATS-safe",
    completeness: "Kelengkapan",
    "complete-name": "Nama lengkap",
    "complete-headline": "Jabatan atau target role",
    "complete-email": "Email",
    "complete-phone": "Nomor telepon",
    "complete-location": "Lokasi",
    "complete-summary": "Ringkasan profesional",
    "complete-evidence": "Pengalaman, proyek, atau relawan",
    "complete-education": "Pendidikan",
    "complete-skills": "Keterampilan",
    content: "Kualitas Konten",
    "content-summary-length": "Ringkasan memiliki panjang efektif",
    "content-bullets": "Memiliki bullet pencapaian",
    "content-impact": "Setidaknya separuh bullet menunjukkan dampak",
    "content-length": "Bullet ringkas dan mudah dipindai",
    "content-skill-evidence": "Keterampilan didukung pengalaman atau proyek",
    consistency: "Konsistensi",
    "consistent-date-format": "Format tanggal konsisten",
    "consistent-date-order": "Urutan tanggal masuk akal",
    "consistent-current-role": "Pekerjaan aktif tanpa tanggal selesai",
    "consistent-links": "Tautan valid dan aman",
    labelVeryReady: "Sangat siap",
    labelReadyWithFixes: "Siap dengan beberapa perbaikan",
    labelNeedsWork: "Perlu diperbaiki",
    labelNotReady: "Belum siap",
  },
  en: {
    structure: "ATS structure",
    "structure-layout": "Single column and linear",
    "structure-text": "Key information is real text",
    "structure-headings": "Standard section headings",
    "structure-contact": "Contact details in the document body",
    "structure-theme": "Template is on the ATS-safe list",
    completeness: "Completeness",
    "complete-name": "Full name",
    "complete-headline": "Job title or target role",
    "complete-email": "Email",
    "complete-phone": "Phone number",
    "complete-location": "Location",
    "complete-summary": "Professional summary",
    "complete-evidence": "Experience, projects, or volunteering",
    "complete-education": "Education",
    "complete-skills": "Skills",
    content: "Content quality",
    "content-summary-length": "The summary has an effective length",
    "content-bullets": "Has achievement bullets",
    "content-impact": "At least half the bullets show impact",
    "content-length": "Bullets are concise and scannable",
    "content-skill-evidence": "Skills are backed by experience or projects",
    consistency: "Consistency",
    "consistent-date-format": "Consistent date format",
    "consistent-date-order": "Sensible date order",
    "consistent-current-role": "Current roles have no end date",
    "consistent-links": "Links are valid and safe",
    labelVeryReady: "Very ready",
    labelReadyWithFixes: "Ready with a few fixes",
    labelNeedsWork: "Needs work",
    labelNotReady: "Not ready yet",
  },
});

const copyFor = (language) => SCORE_COPY[language] ?? SCORE_COPY.id;

const text = (value) => typeof value === "string" ? value.trim() : "";
const validMonth = (value) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value ?? "");
const check = (c, id, weight, pass) => ({ id, label: c[id], weight, pass: Boolean(pass), earned: pass ? weight : 0 });

function evidenceText(cv) {
  const values = [cv.summary];
  cv.experience.forEach((entry) => values.push(entry.role, entry.organization, ...entry.bullets));
  cv.education.forEach((entry) => values.push(entry.qualification, entry.field, entry.institution, ...entry.bullets));
  cv.projects.forEach((entry) => values.push(entry.name, entry.role, ...entry.bullets));
  cv.certifications.forEach((entry) => values.push(entry.name, entry.issuer));
  cv.volunteering.forEach((entry) => values.push(entry.role, entry.organization, ...entry.bullets));
  return values.filter(Boolean).join(" ").toLowerCase();
}

function safeUrl(value) {
  if (!text(value)) return true;
  try { return ["http:", "https:"].includes(new URL(value).protocol); }
  catch { return false; }
}

function category(c, key, checks) {
  const label = c[key];
  const maximum = checks.reduce((sum, item) => sum + item.weight, 0);
  const earned = checks.reduce((sum, item) => sum + item.earned, 0);
  return { key, label, maximum, earned, percent: maximum ? Math.round((earned / maximum) * 100) : 0, checks };
}

export function calculateATSReadiness(cv, previewHTML, language = "id") {
  const c = copyFor(language);
  const safety = evaluateTemplateSafety(previewHTML, cv.settings.theme, language);
  const safetyById = Object.fromEntries(safety.checks.map((item) => [item.id, item.pass]));
  const structure = category(c, "structure", [
    check(c, "structure-layout", 10, safetyById.layout),
    check(c, "structure-text", 10, safetyById.text),
    check(c, "structure-headings", 5, safetyById.headings),
    check(c, "structure-contact", 5, safetyById.body),
    check(c, "structure-theme", 5, safetyById.theme),
  ]);

  const hasEvidence = cv.experience.length > 0 || cv.projects.length > 0 || cv.volunteering.length > 0;
  const completeness = category(c, "completeness", [
    check(c, "complete-name", 4, text(cv.basics.fullName)),
    check(c, "complete-headline", 3, text(cv.basics.headline)),
    check(c, "complete-email", 4, text(cv.basics.email) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cv.basics.email)),
    check(c, "complete-phone", 3, text(cv.basics.phone)),
    check(c, "complete-location", 2, text(cv.basics.location)),
    check(c, "complete-summary", 3, text(cv.summary)),
    check(c, "complete-evidence", 3, hasEvidence),
    check(c, "complete-education", 1, cv.education.length > 0),
    check(c, "complete-skills", 2, cv.skills.some((group) => group.items.some((item) => text(item)))),
  ]);

  const bullets = [...cv.experience.flatMap((entry) => entry.bullets), ...cv.projects.flatMap((entry) => entry.bullets)].filter((item) => text(item));
  const strongBullets = bullets.filter((item) => analyzeBullet(item, language).strong);
  const lengthsAcceptable = bullets.length > 0 && bullets.every((item) => {
    const words = text(item).split(/\s+/).length;
    return words >= 6 && words <= 45;
  });
  const evidence = evidenceText(cv);
  const skillItems = cv.skills.flatMap((group) => group.items).filter((item) => text(item));
  const supportedSkills = skillItems.filter((item) => evidence.includes(item.toLowerCase()));
  const content = category(c, "content", [
    check(c, "content-summary-length", 5, cv.summary.length >= 80 && cv.summary.length <= 600),
    check(c, "content-bullets", 5, bullets.length > 0),
    check(c, "content-impact", 5, bullets.length > 0 && strongBullets.length / bullets.length >= 0.5),
    check(c, "content-length", 5, lengthsAcceptable),
    check(c, "content-skill-evidence", 5, skillItems.length > 0 && supportedSkills.length / skillItems.length >= 0.5),
  ]);

  const dated = [...cv.experience, ...cv.education, ...cv.projects, ...cv.volunteering];
  const dateFormatsValid = dated.length > 0 && dated.every((entry) => !entry.startDate || validMonth(entry.startDate)) && dated.every((entry) => !entry.endDate || validMonth(entry.endDate));
  const dateOrderValid = dated.length > 0 && dated.every((entry) => !entry.startDate || !entry.endDate || entry.endDate >= entry.startDate);
  const currentDatesValid = cv.experience.length > 0 && cv.experience.every((entry) => !entry.current || !entry.endDate);
  const urls = [...cv.basics.links.map((entry) => entry.url), ...cv.projects.map((entry) => entry.url), ...cv.certifications.map((entry) => entry.url)];
  const consistency = category(c, "consistency", [
    check(c, "consistent-date-format", 5, dateFormatsValid),
    check(c, "consistent-date-order", 4, dateOrderValid),
    check(c, "consistent-current-role", 2, currentDatesValid),
    check(c, "consistent-links", 4, urls.every(safeUrl)),
  ]);

  const categories = [structure, completeness, content, consistency];
  const score = categories.reduce((sum, item) => sum + item.earned, 0);
  const label = score >= 85 ? c.labelVeryReady : score >= 70 ? c.labelReadyWithFixes : score >= 50 ? c.labelNeedsWork : c.labelNotReady;
  return { score, maximum: 100, label, categories, keywordCoverageIncluded: false };
}
