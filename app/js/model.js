export const SCHEMA_VERSION = 1;
export const BACKUP_FORMAT = "cv-ats-generator";
export const DEFAULT_SECTION_ORDER = [
  "summary",
  "experience",
  "education",
  "skills",
  "projects",
  "certifications",
  "languages",
  "awards",
  "volunteering",
];

const COLLECTIONS = [
  "experience",
  "education",
  "projects",
  "certifications",
  "skills",
  "languages",
  "awards",
  "volunteering",
];

export class CVValidationError extends Error {
  constructor(issues) {
    super(`Data CV tidak valid: ${issues.join("; ")}`);
    this.name = "CVValidationError";
    this.issues = issues;
  }
}

const asText = (value) => (typeof value === "string" ? value : "");
const asTextList = (value) =>
  Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export function cloneCV(value) {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

export function createId(prefix = "item") {
  const uuid = globalThis.crypto?.randomUUID?.();
  return `${prefix}-${uuid ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}

export function createEmptyCoverLetter() {
  return {
    recipient: "",
    recipientTitle: "",
    city: "",
    date: "",
    greeting: "Dengan hormat,",
    paragraphs: [],
    closing: "Hormat saya,",
  };
}

export function createEmptyCV({ idFactory = createId, now = () => new Date(), locale = "id" } = {}) {
  const timestamp = now().toISOString();
  return {
    schemaVersion: SCHEMA_VERSION,
    id: idFactory("cv"),
    meta: {
      title: "CV Baru",
      locale: locale === "en" ? "en" : "id",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    settings: {
      theme: "clean-sans",
      sectionOrder: [...DEFAULT_SECTION_ORDER],
      visibility: Object.fromEntries(DEFAULT_SECTION_ORDER.map((key) => [key, true])),
    },
    basics: {
      fullName: "",
      headline: "",
      email: "",
      phone: "",
      location: "",
      links: [],
    },
    summary: "",
    experience: [],
    education: [],
    projects: [],
    certifications: [],
    skills: [],
    languages: [],
    awards: [],
    volunteering: [],
    targetJob: {
      title: "",
      company: "",
      description: "",
      dismissedKeywords: [],
    },
    coverLetter: createEmptyCoverLetter(),
  };
}

export const SAMPLE_TEXT = Object.freeze({
  id: {
    headline: "Cloud Engineer · AWS Solutions Architect",
    location: "Jakarta, Indonesia",
    summary: "Cloud Engineer dengan pengalaman membangun platform AWS yang aman, tersedia tinggi, dan mudah dioperasikan. Berfokus pada Amazon EKS, Infrastructure as Code, observability, dan optimasi biaya.",
    experience: {
      role: "Cloud Engineer", organization: "Nusantara Digital", location: "Jakarta",
      bullets: [
        "Membangun platform Amazon EKS untuk 25 workload produksi dengan deployment terstandar melalui Terraform dan CI/CD.",
        "Mengurangi waktu pemulihan insiden sebesar 35% melalui dashboard observability dan runbook operasional.",
      ],
    },
    education: {
      qualification: "Sarjana Teknik Informatika", field: "Teknik Informatika",
      institution: "Universitas Contoh Indonesia", location: "Bandung",
    },
    project: {
      name: "Landing Zone AWS", role: "Cloud Engineer",
      bullets: ["Menyusun baseline akun, jaringan, logging, dan guardrail untuk lingkungan multi-account."],
    },
    skills: [
      { name: "Cloud", items: ["AWS", "Amazon EKS", "Amazon VPC", "CloudWatch"] },
      { name: "Automation", items: ["Terraform", "GitHub Actions", "Python"] },
    ],
    languages: [
      { name: "Bahasa Indonesia", proficiency: "Native" },
      { name: "English", proficiency: "Professional working proficiency" },
    ],
    letter: {
      recipient: "Bapak/Ibu Tim Rekrutmen", city: "Jakarta",
      paragraphs: [
        "Melalui surat ini saya mengajukan diri untuk posisi Senior Cloud Engineer. Saya seorang Cloud Engineer dengan pengalaman tiga tahun membangun dan mengoperasikan platform AWS yang aman, tersedia tinggi, dan efisien secara biaya pada lingkungan produksi.",
        "Di Nusantara Digital saya membangun platform Amazon EKS untuk 25 workload produksi dengan deployment terstandar melalui Terraform dan CI/CD, sehingga proses rilis menjadi konsisten antar tim. Saya juga menurunkan waktu pemulihan insiden sebesar 35% melalui dashboard observability dan runbook operasional yang dipakai saat jaga bergilir, serta menyusun baseline akun, jaringan, dan guardrail untuk lingkungan multi-account.",
        "Kombinasi pengalaman operasional dan otomatisasi tersebut membuat saya terbiasa menyeimbangkan keandalan, keamanan, dan biaya dalam satu keputusan teknis. Saya tertarik berkontribusi pada tim Bapak/Ibu dan siap mendiskusikan bagaimana pengalaman ini dapat mendukung target teknologi perusahaan. Terima kasih atas waktu dan pertimbangannya.",
      ],
    },
  },
  en: {
    headline: "Cloud Engineer · AWS Solutions Architect",
    location: "Jakarta, Indonesia",
    summary: "Cloud Engineer with experience building AWS platforms that are secure, highly available, and straightforward to operate. Focused on Amazon EKS, Infrastructure as Code, observability, and cost optimisation.",
    experience: {
      role: "Cloud Engineer", organization: "Nusantara Digital", location: "Jakarta",
      bullets: [
        "Built an Amazon EKS platform for 25 production workloads, standardising deployment through Terraform and CI/CD.",
        "Reduced incident recovery time by 35% with observability dashboards and operational runbooks used during on-call.",
      ],
    },
    education: {
      qualification: "Bachelor of Computer Science", field: "Computer Science",
      institution: "Example University of Indonesia", location: "Bandung",
    },
    project: {
      name: "AWS Landing Zone", role: "Cloud Engineer",
      bullets: ["Defined the account, network, logging, and guardrail baseline for a multi-account environment."],
    },
    skills: [
      { name: "Cloud", items: ["AWS", "Amazon EKS", "Amazon VPC", "CloudWatch"] },
      { name: "Automation", items: ["Terraform", "GitHub Actions", "Python"] },
    ],
    languages: [
      { name: "Indonesian", proficiency: "Native" },
      { name: "English", proficiency: "Professional working proficiency" },
    ],
    letter: {
      recipient: "Hiring Team", city: "Jakarta",
      paragraphs: [
        "I am writing to apply for the Senior Cloud Engineer role. I am a Cloud Engineer with three years of experience building and operating AWS platforms that are secure, highly available, and cost efficient in production.",
        "At Nusantara Digital I built an Amazon EKS platform for 25 production workloads, standardising deployment through Terraform and CI/CD so releases became consistent across teams. I also reduced incident recovery time by 35% with observability dashboards and operational runbooks used during on-call, and defined the account, network, and guardrail baseline for a multi-account environment.",
        "That mix of operational and automation experience means I am used to balancing reliability, security, and cost in a single technical decision. I would be glad to contribute to your team and to discuss how this experience can support your technology goals. Thank you for your time and consideration.",
      ],
    },
  },
});

export function createSampleCV(options = {}) {
  const locale = options.locale === "en" ? "en" : "id";
  const cv = createEmptyCV({ ...options, locale });
  const id = options.idFactory ?? createId;
  const s = SAMPLE_TEXT[locale];
  cv.meta.title = "Dina Pratama — Cloud Engineer";
  cv.basics = {
    fullName: "Dina Pratama",
    headline: s.headline,
    email: "dina.pratama@example.com",
    phone: "+62 812 3456 7890",
    location: s.location,
    links: [
      { id: id("link"), label: "LinkedIn", url: "https://linkedin.com/in/dinapratama" },
      { id: id("link"), label: "GitHub", url: "https://github.com/dinapratama" },
    ],
  };
  cv.summary = s.summary;
  cv.experience = [
    {
      id: id("exp"),
      role: s.experience.role,
      organization: s.experience.organization,
      location: s.experience.location,
      startDate: "2022-04",
      endDate: "",
      current: true,
      bullets: [...s.experience.bullets],
    },
  ];
  cv.education = [
    {
      id: id("edu"),
      qualification: s.education.qualification,
      field: s.education.field,
      institution: s.education.institution,
      location: s.education.location,
      startDate: "2014-08",
      endDate: "2018-07",
      bullets: [],
    },
  ];
  cv.projects = [
    {
      id: id("project"),
      name: s.project.name,
      role: s.project.role,
      startDate: "2024-01",
      endDate: "2024-06",
      url: "",
      bullets: [...s.project.bullets],
    },
  ];
  cv.certifications = [
    {
      id: id("cert"),
      name: "AWS Certified Solutions Architect — Associate",
      issuer: "Amazon Web Services",
      date: "2024-03",
      credentialId: "",
      url: "",
    },
  ];
  cv.skills = s.skills.map((group) => ({ id: id("skill"), name: group.name, items: [...group.items] }));
  cv.languages = s.languages.map((entry) => ({ id: id("lang"), name: entry.name, proficiency: entry.proficiency }));
  cv.targetJob.title = "Senior Cloud Engineer";
  cv.coverLetter = {
    ...createEmptyCoverLetter(),
    recipient: s.letter.recipient,
    city: s.letter.city,
    paragraphs: [...s.letter.paragraphs],
  };
  return cv;
}

export function validateCV(candidate) {
  const issues = [];
  if (!isObject(candidate)) return ["dokumen harus berupa object"];
  if (candidate.schemaVersion !== SCHEMA_VERSION) {
    issues.push(`schemaVersion harus ${SCHEMA_VERSION}`);
  }
  if (typeof candidate.id !== "string" || !candidate.id) issues.push("id dokumen tidak ada");
  if (!isObject(candidate.meta)) issues.push("meta tidak valid");
  if (!isObject(candidate.settings)) issues.push("settings tidak valid");
  if (!isObject(candidate.basics)) issues.push("basics tidak valid");
  if (typeof candidate.summary !== "string") issues.push("summary harus berupa teks");
  for (const key of COLLECTIONS) {
    if (!Array.isArray(candidate[key])) issues.push(`${key} harus berupa array`);
    else if (candidate[key].some((item) => !isObject(item))) issues.push(`${key} berisi entri tidak valid`);
  }
  if (!isObject(candidate.targetJob)) issues.push("targetJob tidak valid");
  if (candidate.coverLetter !== undefined && !isObject(candidate.coverLetter)) {
    issues.push("coverLetter tidak valid");
  }
  if (isObject(candidate.basics) && !Array.isArray(candidate.basics.links)) {
    issues.push("basics.links harus berupa array");
  }
  return issues;
}

export function assertValidCV(candidate) {
  const issues = validateCV(candidate);
  if (issues.length) throw new CVValidationError(issues);
  return candidate;
}

const normalizeBaseItem = (item, prefix, idFactory) => ({
  ...item,
  id: asText(item.id) || idFactory(prefix),
});

export function normalizeCV(candidate, { idFactory = createId } = {}) {
  assertValidCV(candidate);
  const cv = cloneCV(candidate);
  cv.meta = {
    title: asText(cv.meta.title) || "CV Baru",
    locale: cv.meta.locale === "en" ? "en" : "id",
    createdAt: asText(cv.meta.createdAt),
    updatedAt: asText(cv.meta.updatedAt),
  };
  cv.settings = {
    theme: "clean-sans",
    sectionOrder: Array.isArray(cv.settings.sectionOrder)
      ? cv.settings.sectionOrder.filter((key) => DEFAULT_SECTION_ORDER.includes(key))
      : [...DEFAULT_SECTION_ORDER],
    visibility: isObject(cv.settings.visibility) ? { ...cv.settings.visibility } : {},
  };
  for (const key of DEFAULT_SECTION_ORDER) {
    if (!cv.settings.sectionOrder.includes(key)) cv.settings.sectionOrder.push(key);
    if (typeof cv.settings.visibility[key] !== "boolean") cv.settings.visibility[key] = true;
  }
  cv.basics = {
    fullName: asText(cv.basics.fullName),
    headline: asText(cv.basics.headline),
    email: asText(cv.basics.email),
    phone: asText(cv.basics.phone),
    location: asText(cv.basics.location),
    links: cv.basics.links.map((item) => ({
      ...normalizeBaseItem(item, "link", idFactory),
      label: asText(item.label),
      url: asText(item.url),
    })),
  };
  cv.summary = asText(cv.summary);
  cv.experience = cv.experience.map((item) => ({
    ...normalizeBaseItem(item, "exp", idFactory),
    role: asText(item.role), organization: asText(item.organization), location: asText(item.location),
    startDate: asText(item.startDate), endDate: asText(item.endDate), current: item.current === true,
    bullets: asTextList(item.bullets),
  }));
  cv.education = cv.education.map((item) => ({
    ...normalizeBaseItem(item, "edu", idFactory),
    qualification: asText(item.qualification), field: asText(item.field), institution: asText(item.institution),
    location: asText(item.location), startDate: asText(item.startDate), endDate: asText(item.endDate),
    bullets: asTextList(item.bullets),
  }));
  cv.projects = cv.projects.map((item) => ({
    ...normalizeBaseItem(item, "project", idFactory),
    name: asText(item.name), role: asText(item.role), startDate: asText(item.startDate),
    endDate: asText(item.endDate), url: asText(item.url), bullets: asTextList(item.bullets),
  }));
  cv.certifications = cv.certifications.map((item) => ({
    ...normalizeBaseItem(item, "cert", idFactory),
    name: asText(item.name), issuer: asText(item.issuer), date: asText(item.date),
    credentialId: asText(item.credentialId), url: asText(item.url),
  }));
  cv.skills = cv.skills.map((item) => ({
    ...normalizeBaseItem(item, "skill", idFactory), name: asText(item.name), items: asTextList(item.items),
  }));
  cv.languages = cv.languages.map((item) => ({
    ...normalizeBaseItem(item, "lang", idFactory), name: asText(item.name), proficiency: asText(item.proficiency),
  }));
  cv.awards = cv.awards.map((item) => ({ ...normalizeBaseItem(item, "award", idFactory), title: asText(item.title), issuer: asText(item.issuer), date: asText(item.date), description: asText(item.description) }));
  cv.volunteering = cv.volunteering.map((item) => ({ ...normalizeBaseItem(item, "volunteer", idFactory), role: asText(item.role), organization: asText(item.organization), startDate: asText(item.startDate), endDate: asText(item.endDate), bullets: asTextList(item.bullets) }));
  cv.targetJob = {
    title: asText(cv.targetJob.title),
    company: asText(cv.targetJob.company),
    description: asText(cv.targetJob.description),
    dismissedKeywords: asTextList(cv.targetJob.dismissedKeywords),
  };
  cv.coverLetter = isObject(cv.coverLetter)
    ? {
      recipient: asText(cv.coverLetter.recipient),
      recipientTitle: asText(cv.coverLetter.recipientTitle),
      city: asText(cv.coverLetter.city),
      date: asText(cv.coverLetter.date),
      greeting: asText(cv.coverLetter.greeting),
      paragraphs: asTextList(cv.coverLetter.paragraphs),
      closing: asText(cv.coverLetter.closing),
    }
    : createEmptyCoverLetter();
  return cv;
}

export function touchCV(cv, timestamp = new Date().toISOString()) {
  const next = cloneCV(cv);
  next.meta.updatedAt = timestamp;
  return next;
}

export function hasCoverLetterContent(cv) {
  const letter = cv.coverLetter;
  if (!isObject(letter)) return false;
  if (asText(letter.recipient).trim() || asText(letter.recipientTitle).trim()) return true;
  if (asText(letter.city).trim() || asText(letter.date).trim()) return true;
  return asTextList(letter.paragraphs).some((value) => value.trim());
}

export function isCVEmpty(cv) {
  return !(
    cv.basics.fullName || cv.basics.headline || cv.basics.email || cv.basics.phone ||
    cv.summary || COLLECTIONS.some((key) => cv[key].length > 0) ||
    hasCoverLetterContent(cv)
  );
}
