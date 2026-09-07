export const EDITOR_STEP_KEYS = ["basics", "summary", "experience", "education", "skills", "extras"];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Detection heuristic, not interface copy: both Indonesian and English action verbs
// are recognised so the bullet check works whichever language the CV is written in.
const actionVerbs = new Set([
  "membangun", "merancang", "mengembangkan", "mengotomasi", "mengurangi", "meningkatkan", "mengelola",
  "memimpin", "mengimplementasikan", "memigrasikan", "menyederhanakan", "mengoptimalkan", "menyelesaikan",
  "built", "designed", "developed", "automated", "reduced", "increased", "managed", "led", "implemented",
  "migrated", "streamlined", "optimized", "resolved",
]);

const COPY = Object.freeze({
  id: {
    dateReversed: "Tanggal selesai tidak boleh lebih awal dari tanggal mulai.",
    fullNameRequired: "Nama lengkap wajib diisi.",
    headlineRequired: "Tuliskan posisi saat ini atau posisi yang dituju.",
    emailRequired: "Email wajib diisi.",
    emailInvalid: "Format email belum valid.",
    phoneRequired: "Nomor telepon wajib diisi.",
    locationRequired: "Lokasi wajib diisi.",
    linkUrlRequired: "Tambahkan URL untuk tautan ini.",
    linkLabelRequired: "Beri label seperti LinkedIn atau Portfolio.",
    summaryRequired: "Ringkasan profesional wajib diisi.",
    summaryShort: "Ringkasan masih terlalu singkat; jelaskan keahlian, konteks, dan nilai utama Anda.",
    experienceRequired: "Tambahkan minimal satu pengalaman kerja.",
    roleRequired: "Jabatan wajib diisi.",
    organizationRequired: "Nama perusahaan atau organisasi wajib diisi.",
    startMonthRequired: "Bulan mulai wajib diisi.",
    bulletsRequired: "Tambahkan minimal satu pencapaian atau tanggung jawab.",
    educationRequired: "Tambahkan minimal satu riwayat pendidikan.",
    qualificationRequired: "Gelar atau kualifikasi wajib diisi.",
    institutionRequired: "Institusi pendidikan wajib diisi.",
    skillsRequired: "Tambahkan minimal satu kelompok keterampilan.",
    skillGroupNameRequired: "Nama kelompok keterampilan wajib diisi.",
    skillItemsRequired: "Tambahkan minimal satu keterampilan.",
    entryNameRequired: "Lengkapi nama atau judul entri ini.",
    bulletEmpty: "Tuliskan aksi, konteks, dan dampaknya.",
    bulletActionVerb: "Mulai dengan kata kerja aksi yang jelas.",
    bulletContext: "Tambahkan konteks: apa yang dikerjakan dan untuk siapa atau apa.",
    bulletMeasure: "Tambahkan angka, skala, waktu, kualitas, biaya, atau risiko jika memang tersedia.",
  },
  en: {
    dateReversed: "The end date cannot be earlier than the start date.",
    fullNameRequired: "Your full name is required.",
    headlineRequired: "State your current or target job title.",
    emailRequired: "An email address is required.",
    emailInvalid: "That email format is not valid yet.",
    phoneRequired: "A phone number is required.",
    locationRequired: "A location is required.",
    linkUrlRequired: "Add a URL for this link.",
    linkLabelRequired: "Give it a label such as LinkedIn or Portfolio.",
    summaryRequired: "A professional summary is required.",
    summaryShort: "The summary is still too short; describe your skills, context, and the value you bring.",
    experienceRequired: "Add at least one role.",
    roleRequired: "A job title is required.",
    organizationRequired: "A company or organisation name is required.",
    startMonthRequired: "A start month is required.",
    bulletsRequired: "Add at least one achievement or responsibility.",
    educationRequired: "Add at least one qualification.",
    qualificationRequired: "A degree or qualification is required.",
    institutionRequired: "An institution is required.",
    skillsRequired: "Add at least one skill group.",
    skillGroupNameRequired: "A skill group name is required.",
    skillItemsRequired: "Add at least one skill.",
    entryNameRequired: "Complete the name or title of this entry.",
    bulletEmpty: "Write the action, the context, and the impact.",
    bulletActionVerb: "Start with a clear action verb.",
    bulletContext: "Add context: what you did, and for whom or what.",
    bulletMeasure: "Add a number, scale, time, quality, cost, or risk when you genuinely have one.",
  },
});

const copyFor = (language) => COPY[language] ?? COPY.id;

const text = (value) => typeof value === "string" ? value.trim() : "";
const hasEntryContent = (entry) => Object.entries(entry).some(([key, value]) =>
  key !== "id" && (Array.isArray(value) ? value.some(Boolean) : typeof value === "boolean" ? value : text(value)));

function issue(path, message) { return { path, message }; }
function dateIssue(entry, basePath, issues, c) {
  if (entry.startDate && entry.endDate && entry.endDate < entry.startDate) {
    issues.push(issue(`${basePath}.endDate`, c.dateReversed));
  }
}

export function validateStep(cv, stepKey, language = "id") {
  const c = copyFor(language);
  const issues = [];
  if (stepKey === "basics") {
    if (!text(cv.basics.fullName)) issues.push(issue("basics.fullName", c.fullNameRequired));
    if (!text(cv.basics.headline)) issues.push(issue("basics.headline", c.headlineRequired));
    if (!text(cv.basics.email)) issues.push(issue("basics.email", c.emailRequired));
    else if (!emailPattern.test(text(cv.basics.email))) issues.push(issue("basics.email", c.emailInvalid));
    if (!text(cv.basics.phone)) issues.push(issue("basics.phone", c.phoneRequired));
    if (!text(cv.basics.location)) issues.push(issue("basics.location", c.locationRequired));
    cv.basics.links.forEach((entry) => {
      if (text(entry.label) && !text(entry.url)) issues.push(issue(`links.${entry.id}.url`, c.linkUrlRequired));
      if (text(entry.url) && !text(entry.label)) issues.push(issue(`links.${entry.id}.label`, c.linkLabelRequired));
    });
  }
  if (stepKey === "summary") {
    if (!text(cv.summary)) issues.push(issue("summary", c.summaryRequired));
    else if (text(cv.summary).length < 60) issues.push(issue("summary", c.summaryShort));
  }
  if (stepKey === "experience") {
    if (!cv.experience.length) issues.push(issue("experience", c.experienceRequired));
    cv.experience.forEach((entry) => {
      const base = `experience.${entry.id}`;
      if (!text(entry.role)) issues.push(issue(`${base}.role`, c.roleRequired));
      if (!text(entry.organization)) issues.push(issue(`${base}.organization`, c.organizationRequired));
      if (!text(entry.startDate)) issues.push(issue(`${base}.startDate`, c.startMonthRequired));
      if (!entry.bullets.some((value) => text(value))) issues.push(issue(`${base}.bullets`, c.bulletsRequired));
      dateIssue(entry, base, issues, c);
    });
  }
  if (stepKey === "education") {
    if (!cv.education.length) issues.push(issue("education", c.educationRequired));
    cv.education.forEach((entry) => {
      const base = `education.${entry.id}`;
      if (!text(entry.qualification)) issues.push(issue(`${base}.qualification`, c.qualificationRequired));
      if (!text(entry.institution)) issues.push(issue(`${base}.institution`, c.institutionRequired));
      if (!text(entry.startDate)) issues.push(issue(`${base}.startDate`, c.startMonthRequired));
      dateIssue(entry, base, issues, c);
    });
  }
  if (stepKey === "skills") {
    if (!cv.skills.length) issues.push(issue("skills", c.skillsRequired));
    cv.skills.forEach((entry) => {
      const base = `skills.${entry.id}`;
      if (!text(entry.name)) issues.push(issue(`${base}.name`, c.skillGroupNameRequired));
      if (!entry.items.some((value) => text(value))) issues.push(issue(`${base}.items`, c.skillItemsRequired));
    });
  }
  if (stepKey === "extras") {
    for (const key of ["projects", "certifications", "languages", "awards", "volunteering"]) {
      cv[key].forEach((entry) => {
        if (!hasEntryContent(entry)) return;
        const base = `${key}.${entry.id}`;
        const primary = key === "projects" ? "name" : key === "certifications" ? "name" : key === "languages" ? "name" : key === "awards" ? "title" : "role";
        if (!text(entry[primary])) issues.push(issue(`${base}.${primary}`, c.entryNameRequired));
        if ("startDate" in entry) dateIssue(entry, base, issues, c);
      });
    }
  }
  return issues;
}

export function validateAll(cv, language = "id") {
  return EDITOR_STEP_KEYS.flatMap((key) => validateStep(cv, key, language).map((entry) => ({ ...entry, step: key })));
}

export function evaluateCompleteness(cv) {
  const checks = [
    ["basics", Boolean(text(cv.basics.fullName))], ["basics", Boolean(text(cv.basics.headline))],
    ["basics", emailPattern.test(text(cv.basics.email))], ["basics", Boolean(text(cv.basics.phone))],
    ["basics", Boolean(text(cv.basics.location))], ["summary", text(cv.summary).length >= 60],
    ["experience", cv.experience.length > 0],
    ["experience", cv.experience.some((entry) => entry.bullets.some((value) => text(value)))],
    ["education", cv.education.length > 0], ["skills", cv.skills.length > 0],
    ["skills", cv.skills.some((entry) => entry.items.some((value) => text(value)))],
  ];
  const completed = checks.filter(([, pass]) => pass).length;
  const steps = Object.fromEntries(EDITOR_STEP_KEYS.map((key) => {
    const relevant = checks.filter(([step]) => step === key);
    const done = relevant.length ? relevant.filter(([, pass]) => pass).length === relevant.length : true;
    return [key, { done, errors: validateStep(cv, key).length }];
  }));
  return { completed, total: checks.length, percent: Math.round((completed / checks.length) * 100), steps };
}

export function analyzeBullet(value, language = "id") {
  const c = copyFor(language);
  const clean = text(value);
  if (!clean) return { strong: false, suggestions: [c.bulletEmpty] };
  const first = clean.toLowerCase().split(/\s+/)[0].replace(/[^a-z]/g, "");
  const hasActionVerb = actionVerbs.has(first);
  const hasMeasure = /\b\d+(?:[.,]\d+)?\s*(?:%|x|jam|hari|minggu|bulan|tahun|workload|akun|server|menit)?\b/i.test(clean);
  const enoughContext = clean.split(/\s+/).length >= 8;
  const suggestions = [];
  if (!hasActionVerb) suggestions.push(c.bulletActionVerb);
  if (!enoughContext) suggestions.push(c.bulletContext);
  if (!hasMeasure) suggestions.push(c.bulletMeasure);
  return { strong: hasActionVerb && enoughContext && hasMeasure, hasActionVerb, hasMeasure, enoughContext, suggestions };
}
