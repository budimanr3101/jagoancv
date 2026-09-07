const headings = {
  id: { summary: "Ringkasan Profesional", experience: "Pengalaman Kerja", education: "Pendidikan", skills: "Keterampilan", projects: "Proyek", certifications: "Sertifikasi", languages: "Bahasa", awards: "Penghargaan", volunteering: "Pengalaman Relawan", present: "Sekarang" },
  en: { summary: "Professional Summary", experience: "Work Experience", education: "Education", skills: "Skills", projects: "Projects", certifications: "Certifications", languages: "Languages", awards: "Awards", volunteering: "Volunteer Experience", present: "Present" },
};

const esc = (value = "") => String(value).replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
}[character]));
const text = (value) => typeof value === "string" ? value.trim() : "";
const visible = (cv, key) => cv.settings.visibility[key] !== false;

export function formatMonth(value, locale = "id") {
  if (!/^\d{4}-\d{2}$/.test(value ?? "")) return "";
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "id-ID", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function dateRange(entry, locale) {
  const start = formatMonth(entry.startDate, locale);
  const end = entry.current ? headings[locale].present : formatMonth(entry.endDate, locale);
  return [start, end].filter(Boolean).join(" – ");
}

function safeHref(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

function displayUrl(value) {
  try {
    const url = new URL(value);
    return `${url.host}${url.pathname === "/" ? "" : url.pathname}`.replace(/\/$/, "");
  } catch { return value; }
}

function bullets(values) {
  const items = (values ?? []).filter((value) => text(value));
  return items.length ? `<ul>${items.map((value) => `<li>${esc(value)}</li>`).join("")}</ul>` : "";
}

function section(key, content, activeStep, locale) {
  if (!content) return "";
  const active = activeStep === key || (activeStep === "extras" && ["projects", "certifications", "languages", "awards", "volunteering"].includes(key));
  return `<section class="cv-section${active ? " is-active-section" : ""}" data-preview-section="${key}"><h2>${headings[locale][key]}</h2>${content}</section>`;
}

function renderContact(cv) {
  const parts = [cv.basics.location, cv.basics.email, cv.basics.phone].filter((value) => text(value)).map((value) => `<span>${esc(value)}</span>`);
  for (const link of cv.basics.links) {
    if (!text(link.label) && !text(link.url)) continue;
    const href = safeHref(link.url);
    const label = [text(link.label), text(link.url) ? displayUrl(link.url) : ""].filter(Boolean).join(": ");
    parts.push(href ? `<a href="${esc(href)}">${esc(label)}</a>` : `<span>${esc(label)}</span>`);
  }
  return parts.length ? `<p class="cv-contact">${parts.join("<span class=\"cv-separator\"> · </span>")}</p>` : "";
}

function renderExperience(cv, locale) {
  return cv.experience.map((entry) => {
    const title = [text(entry.role), text(entry.organization)].filter(Boolean).join(" · ");
    const meta = [text(entry.location), dateRange(entry, locale)].filter(Boolean).join(" · ");
    if (!title && !meta && !entry.bullets.some((value) => text(value))) return "";
    return `<article class="cv-entry"><div class="cv-entry-heading"><strong>${esc(title || entry.organization)}</strong>${meta ? `<span>${esc(meta)}</span>` : ""}</div>${bullets(entry.bullets)}</article>`;
  }).join("");
}

function renderEducation(cv, locale) {
  return cv.education.map((entry) => {
    const title = [text(entry.qualification), text(entry.field)].filter(Boolean).join(" — ");
    const organization = [text(entry.institution), text(entry.location)].filter(Boolean).join(" · ");
    const dates = dateRange(entry, locale);
    if (!title && !organization && !dates) return "";
    return `<article class="cv-entry"><div class="cv-entry-heading"><strong>${esc(title || organization)}</strong>${dates ? `<span>${esc(dates)}</span>` : ""}</div>${title && organization ? `<p>${esc(organization)}</p>` : ""}${bullets(entry.bullets)}</article>`;
  }).join("");
}

function renderSkills(cv) {
  return cv.skills.map((entry) => {
    const items = entry.items.filter((value) => text(value));
    if (!text(entry.name) && !items.length) return "";
    return `<p class="cv-skill"><strong>${esc(entry.name)}${entry.name ? ":" : ""}</strong> ${esc(items.join(", "))}</p>`;
  }).join("");
}

function renderProjects(cv, locale) {
  return cv.projects.map((entry) => {
    const title = [text(entry.name), text(entry.role)].filter(Boolean).join(" · ");
    const dates = dateRange(entry, locale);
    const href = safeHref(entry.url);
    if (!title && !dates && !entry.bullets.some((value) => text(value))) return "";
    return `<article class="cv-entry"><div class="cv-entry-heading"><strong>${esc(title)}</strong>${dates ? `<span>${esc(dates)}</span>` : ""}</div>${href ? `<p><a href="${esc(href)}">${esc(displayUrl(entry.url))}</a></p>` : ""}${bullets(entry.bullets)}</article>`;
  }).join("");
}

function renderCertifications(cv, locale) {
  return cv.certifications.map((entry) => {
    const title = [text(entry.name), text(entry.issuer)].filter(Boolean).join(" · ");
    const details = [formatMonth(entry.date, locale), text(entry.credentialId) ? `ID ${entry.credentialId}` : ""].filter(Boolean).join(" · ");
    const href = safeHref(entry.url);
    if (!title && !details) return "";
    return `<article class="cv-entry cv-entry-compact"><div class="cv-entry-heading"><strong>${href ? `<a href="${esc(href)}">${esc(title)}</a>` : esc(title)}</strong>${details ? `<span>${esc(details)}</span>` : ""}</div></article>`;
  }).join("");
}

function renderLanguages(cv) {
  return cv.languages.map((entry) => text(entry.name) || text(entry.proficiency)
    ? `<p class="cv-skill"><strong>${esc(entry.name)}${entry.name ? ":" : ""}</strong> ${esc(entry.proficiency)}</p>` : "").join("");
}

function renderAwards(cv, locale) {
  return cv.awards.map((entry) => {
    const title = [text(entry.title), text(entry.issuer)].filter(Boolean).join(" · ");
    if (!title && !text(entry.description)) return "";
    return `<article class="cv-entry"><div class="cv-entry-heading"><strong>${esc(title)}</strong>${entry.date ? `<span>${esc(formatMonth(entry.date, locale))}</span>` : ""}</div>${entry.description ? `<p>${esc(entry.description)}</p>` : ""}</article>`;
  }).join("");
}

function renderVolunteering(cv, locale) {
  return cv.volunteering.map((entry) => {
    const title = [text(entry.role), text(entry.organization)].filter(Boolean).join(" · ");
    if (!title && !entry.bullets.some((value) => text(value))) return "";
    return `<article class="cv-entry"><div class="cv-entry-heading"><strong>${esc(title)}</strong><span>${esc(dateRange(entry, locale))}</span></div>${bullets(entry.bullets)}</article>`;
  }).join("");
}

export function renderCVDocument(cv, activeStep = "basics") {
  const locale = cv.meta.locale === "en" ? "en" : "id";
  const theme = "clean-sans";
  const hasIdentity = [cv.basics.fullName, cv.basics.headline, cv.basics.email, cv.basics.phone].some((value) => text(value));
  const ordered = {
    summary: visible(cv, "summary") ? section("summary", text(cv.summary) ? `<p>${esc(cv.summary)}</p>` : "", activeStep, locale) : "",
    experience: visible(cv, "experience") ? section("experience", renderExperience(cv, locale), activeStep, locale) : "",
    education: visible(cv, "education") ? section("education", renderEducation(cv, locale), activeStep, locale) : "",
    skills: visible(cv, "skills") ? section("skills", renderSkills(cv), activeStep, locale) : "",
    projects: visible(cv, "projects") ? section("projects", renderProjects(cv, locale), activeStep, locale) : "",
    certifications: visible(cv, "certifications") ? section("certifications", renderCertifications(cv, locale), activeStep, locale) : "",
    languages: visible(cv, "languages") ? section("languages", renderLanguages(cv), activeStep, locale) : "",
    awards: visible(cv, "awards") ? section("awards", renderAwards(cv, locale), activeStep, locale) : "",
    volunteering: visible(cv, "volunteering") ? section("volunteering", renderVolunteering(cv, locale), activeStep, locale) : "",
  };
  const body = cv.settings.sectionOrder.map((key) => ordered[key] ?? "").join("");
  const empty = !hasIdentity && !body ? `<p class="cv-empty">Mulai isi data diri untuk melihat CV Anda.</p>` : "";
  return `<article class="cv-document theme-${theme}" aria-label="Live preview CV"><section class="cv-identity${activeStep === "basics" ? " is-active-section" : ""}" data-preview-section="basics"><h1>${esc(cv.basics.fullName || "Nama Anda")}</h1>${cv.basics.headline ? `<p class="cv-headline">${esc(cv.basics.headline)}</p>` : ""}${renderContact(cv)}</section>${body}${empty}</article>`;
}

const letterLabels = {
  id: { to: "Kepada", subject: "Hal", application: "Lamaran posisi", empty: "Mulai isi surat lamaran untuk melihat hasilnya." },
  en: { to: "To", subject: "Subject", application: "Application for", empty: "Start writing the cover letter to see it here." },
};

export function formatLetterDate(value, locale = "id") {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? "")) return "";
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "id-ID", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function renderLetterPlace(letter, locale) {
  const city = text(letter.city);
  const date = formatLetterDate(letter.date, locale);
  const line = [city, date].filter(Boolean).join(", ");
  return line ? `<p class="letter-place">${esc(line)}</p>` : "";
}

function renderLetterRecipient(cv, locale) {
  const labels = letterLabels[locale];
  const lines = [
    text(cv.coverLetter.recipient),
    text(cv.coverLetter.recipientTitle),
    text(cv.targetJob.company),
  ].filter(Boolean);
  if (!lines.length) return "";
  return `<section class="letter-recipient"><p>${esc(labels.to)}<br>${lines.map((line) => esc(line)).join("<br>")}</p></section>`;
}

function renderLetterSubject(cv, locale) {
  const labels = letterLabels[locale];
  const role = text(cv.targetJob.title);
  if (!role) return "";
  return `<p class="letter-subject"><strong>${esc(labels.subject)}: ${esc(labels.application)} ${esc(role)}</strong></p>`;
}

export function renderCoverLetterDocument(cv) {
  const locale = cv.meta.locale === "en" ? "en" : "id";
  const letter = cv.coverLetter;
  const paragraphs = (letter.paragraphs ?? []).filter((value) => text(value));
  const body = paragraphs.map((value) => `<p>${esc(value)}</p>`).join("");
  const greeting = text(letter.greeting) ? `<p class="letter-greeting">${esc(letter.greeting)}</p>` : "";
  const closing = text(letter.closing) ? `<p class="letter-closing">${esc(letter.closing)}</p>` : "";
  const signature = text(cv.basics.fullName) ? `<p class="letter-signature">${esc(cv.basics.fullName)}</p>` : "";
  const hasIdentity = [cv.basics.fullName, cv.basics.email, cv.basics.phone].some((value) => text(value));
  const empty = !body && !hasIdentity ? `<p class="cv-empty">${esc(letterLabels[locale].empty)}</p>` : "";

  return `<article class="cv-document theme-clean-sans letter-document" aria-label="Live preview Surat Lamaran">` +
    `<section class="cv-identity" data-preview-section="basics">` +
      `<h1>${esc(cv.basics.fullName || "Nama Anda")}</h1>` +
      (cv.basics.headline ? `<p class="cv-headline">${esc(cv.basics.headline)}</p>` : "") +
      renderContact(cv) +
    `</section>` +
    renderLetterPlace(letter, locale) +
    renderLetterRecipient(cv, locale) +
    renderLetterSubject(cv, locale) +
    greeting +
    `<section class="letter-body">${body}</section>` +
    closing +
    signature +
    empty +
    `</article>`;
}
