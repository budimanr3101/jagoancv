const stopWords = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "have", "in", "is", "it", "of", "on", "or", "our", "that", "the", "this", "to", "we", "will", "with", "you", "your",
  "ability", "candidate", "experience", "job", "position", "preferred", "required", "requirements", "responsibilities", "role", "strong", "team", "work", "working", "year", "years",
  "adalah", "akan", "anda", "atau", "dalam", "dan", "dari", "dengan", "di", "kami", "ke", "kemampuan", "kerja", "memiliki", "menjadi", "pada", "pekerjaan", "pengalaman", "posisi", "serta", "tahun", "untuk", "yang",
]);
const technicalTokens = new Set([
  "aws", "azure", "gcp", "cloud", "kubernetes", "docker", "terraform", "ansible", "linux", "python", "java", "javascript", "typescript", "sql", "nosql", "devops", "devsecops", "sre", "eks", "ecs", "ec2", "vpc", "iam", "cloudwatch", "prometheus", "grafana", "jenkins", "gitlab", "github", "ci/cd", "iac", "networking", "security", "finops", "serverless", "lambda", "microservices", "observability", "automation", "agile", "scrum",
]);
const knownPhrases = new Set([
  "amazon web services", "google cloud platform", "infrastructure as code", "continuous integration", "continuous delivery", "disaster recovery", "cost optimization", "high availability", "site reliability", "cloud engineer", "solutions architect", "container orchestration", "incident response", "network security", "technical leadership",
]);
const displayOverrides = {
  aws: "AWS", gcp: "GCP", eks: "EKS", ecs: "ECS", ec2: "EC2", vpc: "VPC", iam: "IAM", sql: "SQL", nosql: "NoSQL", "ci/cd": "CI/CD", iac: "IaC", sre: "SRE", devops: "DevOps", devsecops: "DevSecOps", github: "GitHub", gitlab: "GitLab", cloudwatch: "CloudWatch", kubernetes: "Kubernetes", terraform: "Terraform", python: "Python", javascript: "JavaScript", typescript: "TypeScript",
};

function rawTokens(value) {
  return (value.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}+#./-]*/gu) ?? [])
    .map((token) => token.replace(/^[./-]+|[./-]+$/g, ""))
    .filter(Boolean);
}

function stem(token) {
  if (technicalTokens.has(token) || token.includes("/") || token.includes("+") || token.includes(".")) return token;
  if (token.length > 5 && token.endsWith("ies")) return `${token.slice(0, -3)}y`;
  if (token.length > 5 && token.endsWith("es")) return token.slice(0, -2);
  if (token.length > 4 && token.endsWith("s")) return token.slice(0, -1);
  return token;
}

export function normalizeKeyword(value) {
  return rawTokens(value).map(stem).join(" ");
}

function displayTerm(key) {
  if (displayOverrides[key]) return displayOverrides[key];
  return key.split(" ").map((token) => displayOverrides[token] ?? token).join(" ");
}

export function cvToPlainText(cv) {
  const values = [cv.basics.fullName, cv.basics.headline, cv.basics.email, cv.basics.phone, cv.basics.location, cv.summary];
  cv.basics.links.forEach((entry) => values.push(entry.label, entry.url));
  cv.experience.forEach((entry) => values.push(entry.role, entry.organization, entry.location, ...entry.bullets));
  cv.education.forEach((entry) => values.push(entry.qualification, entry.field, entry.institution, entry.location, ...entry.bullets));
  cv.projects.forEach((entry) => values.push(entry.name, entry.role, ...entry.bullets));
  cv.certifications.forEach((entry) => values.push(entry.name, entry.issuer));
  cv.skills.forEach((entry) => values.push(entry.name, ...entry.items));
  cv.languages.forEach((entry) => values.push(entry.name, entry.proficiency));
  cv.awards.forEach((entry) => values.push(entry.title, entry.issuer, entry.description));
  cv.volunteering.forEach((entry) => values.push(entry.role, entry.organization, ...entry.bullets));
  return values.filter(Boolean).join(" ");
}

export function extractJobKeywords(description, { limit = 20 } = {}) {
  const tokens = rawTokens(description);
  const content = tokens.filter((token) => token.length > 1 && !stopWords.has(token));
  const candidates = new Map();
  const add = (key, score, count = 1) => {
    if (!key || stopWords.has(key)) return;
    const current = candidates.get(key) ?? { key, count: 0, score: 0 };
    current.count += count;
    current.score += score;
    candidates.set(key, current);
  };
  const counts = new Map();
  content.forEach((token) => {
    const key = stem(token);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  for (const [key, count] of counts) {
    const technical = technicalTokens.has(key);
    add(key, count * 5 + (technical ? 12 : 0) + Math.min(key.length, 10) / 10, count);
  }
  for (let size = 2; size <= 3; size += 1) {
    for (let index = 0; index <= content.length - size; index += 1) {
      const phraseTokens = content.slice(index, index + size).map(stem);
      if (phraseTokens.some((token) => stopWords.has(token))) continue;
      const key = phraseTokens.join(" ");
      const known = knownPhrases.has(key);
      const technical = phraseTokens.some((token) => technicalTokens.has(token));
      const repeats = description.toLowerCase().split(key).length - 1;
      if (!known && !technical && repeats < 2) continue;
      add(key, size * 4 + (known ? 15 : 0) + (technical ? 5 : 0) + Math.max(0, repeats - 1) * 3);
    }
  }
  const ranked = [...candidates.values()]
    .filter((entry) => entry.count > 1 || technicalTokens.has(entry.key) || knownPhrases.has(entry.key) || entry.key.includes(" "))
    .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key))
    .filter((entry, index, all) => !all.some((other, otherIndex) => otherIndex < index && other.key.includes(entry.key) && other.key !== entry.key))
    .slice(0, limit);
  return ranked.map((entry) => ({ ...entry, label: displayTerm(entry.key) }));
}

export function coverLetterToPlainText(cv) {
  return (cv.coverLetter?.paragraphs ?? []).filter((value) => typeof value === "string").join(" ");
}

export function matchJobDescription(cv, description = cv.targetJob.description, { limit = 20, sourceText } = {}) {
  const keywords = extractJobKeywords(description, { limit });
  const cvTokens = ` ${normalizeKeyword(sourceText ?? cvToPlainText(cv))} `;
  const dismissedSet = new Set((cv.targetJob.dismissedKeywords ?? []).map(normalizeKeyword));
  const groups = { matched: [], missing: [], dismissed: [] };
  for (const keyword of keywords) {
    const normalized = normalizeKeyword(keyword.key);
    const item = { ...keyword, key: normalized };
    if (dismissedSet.has(normalized)) groups.dismissed.push(item);
    else if (cvTokens.includes(` ${normalized} `)) groups.matched.push(item);
    else groups.missing.push(item);
  }
  const relevant = groups.matched.length + groups.missing.length;
  const coverage = relevant ? Math.round((groups.matched.length / relevant) * 100) : null;
  return { ...groups, coverage, total: keywords.length };
}
