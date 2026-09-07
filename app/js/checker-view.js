import { evaluateTemplateSafety, runATSChecks, summarizeATSFindings } from "./ats-checker.js";
import { matchJobDescription, coverLetterToPlainText } from "./keyword-match.js";
import { calculateATSReadiness } from "./ats-score.js";
import { LETTER_LENGTH, coverLetterStats, runCoverLetterChecks } from "./letter-checks.js";
import { translator } from "./i18n.js";

const esc = (value = "") => String(value).replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
}[character]));

export function buildCheckReport(cv, previewHTML, language = "id") {
  const findings = runATSChecks(cv, { previewHTML, language });
  const summary = summarizeATSFindings(findings);
  const safety = evaluateTemplateSafety(previewHTML, cv.settings.theme, language);
  const readiness = calculateATSReadiness(cv, previewHTML, language);
  const keywords = matchJobDescription(cv);
  return { findings, summary, safety, readiness, keywords };
}

const severityKeys = { error: "severity.error", warning: "severity.warning", recommendation: "severity.recommendation", info: "severity.info" };

function renderFinding(entry, t) {
  return `<article class="ats-finding ${entry.severity}"><div class="finding-code">${esc(entry.id)} · ${esc(t(severityKeys[entry.severity] ?? "severity.info"))}</div><strong>${esc(entry.title)}</strong><p>${esc(entry.message)}</p>${entry.step ? `<button type="button" data-go-step="${esc(entry.step)}">${esc(t("checker.openSection"))}</button>` : ""}</article>`;
}

function renderFindingGroup(title, entries, emptyMessage, t) {
  return `<section class="ats-group"><h3>${esc(title)} <span>${entries.length}</span></h3>${entries.length ? entries.map((entry) => renderFinding(entry, t)).join("") : `<p class="ats-empty">${esc(emptyMessage)}</p>`}</section>`;
}

function keywordRow(item, state, subject, t) {
  const action = state === "dismissed" ? "restore" : "dismiss";
  const actionLabel = state === "dismissed" ? t("keyword.restore") : t("keyword.dismiss");
  const stateLabel = state === "matched"
    ? t("keyword.present", { subject })
    : state === "missing" ? t("keyword.notFound") : t("keyword.dismissedState");
  return `<div class="keyword-row ${state}"><div><strong>${esc(item.label)}</strong><span>${stateLabel}</span></div>${state !== "matched" ? `<button type="button" data-keyword-action="${action}" data-keyword="${esc(item.key)}">${actionLabel}</button>` : ""}</div>`;
}

function renderKeywordSection(cv, keywords, subject, t) {
  const hasDescription = cv.targetJob.description.trim().length > 0;
  const coverage = keywords.coverage === null ? "—" : `${keywords.coverage}%`;
  return `<section class="job-alignment"><div class="alignment-heading"><div><span class="check-kicker">${esc(t("keyword.kicker"))}</span><h3>${esc(t("keyword.title"))}</h3></div><div class="coverage-value"><strong>${coverage}</strong><span>${esc(t("keyword.disclaimer"))}</span></div></div><p class="alignment-note">${esc(t("keyword.note", { subject }))}</p><div class="target-job-fields"><div class="field"><label for="target-job-title">${esc(t("keyword.targetRole"))}</label><input id="target-job-title" data-target-job-field="title" value="${esc(cv.targetJob.title)}" placeholder="Senior Cloud Engineer"></div><div class="field"><label for="target-job-company">${esc(t("keyword.company"))}</label><input id="target-job-company" data-target-job-field="company" value="${esc(cv.targetJob.company)}" placeholder="${esc(t("keyword.companyPlaceholder"))}"></div><div class="field field-wide"><label for="target-job-description">${esc(t("keyword.description"))}</label><textarea id="target-job-description" data-target-job-field="description" placeholder="${esc(t("keyword.descriptionPlaceholder"))}">${esc(cv.targetJob.description)}</textarea><small>${esc(t("keyword.descriptionHelp"))}</small></div></div>${hasDescription ? `<div class="keyword-columns"><div><h4>${esc(t("keyword.presentGroup"))} <span>${keywords.matched.length}</span></h4>${keywords.matched.map((item) => keywordRow(item, "matched", subject, t)).join("") || `<p class="ats-empty">${esc(t("keyword.noneMatched"))}</p>`}</div><div><h4>${esc(t("keyword.missingGroup"))} <span>${keywords.missing.length}</span></h4>${keywords.missing.map((item) => keywordRow(item, "missing", subject, t)).join("") || `<p class="ats-empty">${esc(t("keyword.noneMissing"))}</p>`}</div></div>${keywords.dismissed.length ? `<details class="dismissed-keywords"><summary>${esc(t("keyword.dismissedGroup", { count: keywords.dismissed.length }))}</summary>${keywords.dismissed.map((item) => keywordRow(item, "dismissed", subject, t)).join("")}</details>` : ""}` : `<div class="alignment-empty"><strong>${esc(t("keyword.emptyTitle"))}</strong><p>${esc(t("keyword.emptyBody"))}</p></div>`}</section>`;
}

function renderReadiness(readiness, t) {
  const categories = readiness.categories.map((category) => `<div class="score-category"><div><strong>${esc(category.label)}</strong><span>${category.earned}/${category.maximum}</span></div><div class="score-track" aria-label="${esc(category.label)} ${category.percent}%"><span style="width:${category.percent}%"></span></div></div>`).join("");
  const details = readiness.categories.map((category) => `<section><h4>${esc(category.label)}</h4>${category.checks.map((item) => `<p class="score-check ${item.pass ? "pass" : "fail"}"><strong>${esc(item.pass ? t("checker.pass") : t("checker.fail"))}</strong> · ${esc(item.label)} <span>${item.earned}/${item.weight}</span></p>`).join("")}</section>`).join("");
  return `<section class="readiness-score"><div class="score-overview"><div><span class="check-kicker">${esc(t("score.kicker"))}</span><div class="score-number"><strong>${readiness.score}</strong><span>/100</span></div><p>${esc(readiness.label)}</p></div><p class="score-disclaimer">${esc(t("score.disclaimer"))}</p></div><div class="score-breakdown">${categories}</div><details class="score-method"><summary>${esc(t("score.method"))}</summary>${details}</details></section>`;
}

export function renderATSCheckPanel(cv, previewHTML, language = "id") {
  const t = translator(language);
  const report = buildCheckReport(cv, previewHTML, language);
  const urgent = report.findings.filter((entry) => entry.severity === "error" || entry.severity === "warning");
  const recommended = report.findings.filter((entry) => entry.severity === "recommendation");
  return {
    report,
    html: `<section class="ats-panel"><header class="ats-heading"><span class="check-kicker">${esc(t("checker.kicker"))}</span><h2>${esc(t("atsPanel.title"))}</h2><p>${esc(t("atsPanel.intro"))}</p></header>${renderReadiness(report.readiness, t)}<div class="ats-counts"><div><strong>${report.summary.errors}</strong><span>${esc(t("checker.errors"))}</span></div><div><strong>${report.summary.warnings}</strong><span>${esc(t("checker.warnings"))}</span></div><div><strong>${report.summary.recommendations}</strong><span>${esc(t("checker.suggestions"))}</span></div></div><section class="template-audit ${report.safety.safe ? "safe" : "unsafe"}"><div><span class="check-kicker">${esc(t("atsPanel.templateKicker"))}</span><h3>${esc(t("template.cleanSans"))}</h3></div><strong>${esc(report.safety.safe ? t("atsPanel.structureSafe") : t("atsPanel.structureFix"))}</strong>${report.safety.checks.map((entry) => `<p class="template-check ${entry.pass ? "pass" : "fail"}">${esc(entry.pass ? t("checker.pass") : t("checker.fail"))} · ${esc(entry.label)}</p>`).join("")}</section>${renderFindingGroup(t("checker.fixFirst"), urgent, t("atsPanel.noFindings"), t)}${renderFindingGroup(t("checker.suggested"), recommended, t("atsPanel.noSuggestions"), t)}${renderKeywordSection(cv, report.keywords, t("subject.cv"), t)}</section>`,
  };
}

export function buildLetterReport(cv, language = "id") {
  const findings = runCoverLetterChecks(cv, language);
  const summary = summarizeATSFindings(findings);
  const stats = coverLetterStats(cv);
  const keywords = matchJobDescription(cv, cv.targetJob.description, { sourceText: coverLetterToPlainText(cv) });
  return { findings, summary, stats, keywords };
}

function lengthVerdict(stats, t) {
  if (!stats.paragraphs) return { label: t("letterPanel.noBody"), safe: false };
  if (stats.words < LETTER_LENGTH.min) return { label: t("letterPanel.tooShort"), safe: false };
  if (stats.words > LETTER_LENGTH.max) return { label: t("letterPanel.tooLong"), safe: false };
  return { label: t("letterPanel.ideal"), safe: true };
}

function renderLetterStats(cv, stats, t) {
  const verdict = lengthVerdict(stats, t);
  const rows = [
    { pass: stats.paragraphs >= 3, label: t("letterPanel.rowParagraphs", { count: stats.paragraphs }) },
    { pass: verdict.safe, label: t("letterPanel.rowWords", { count: stats.words, min: LETTER_LENGTH.min, max: LETTER_LENGTH.max }) },
    { pass: /\d/.test(stats.body), label: t("letterPanel.rowNumbers") },
    { pass: Boolean(cv.coverLetter.city.trim() && cv.coverLetter.date.trim()), label: t("letterPanel.rowCityDate") },
  ];
  return `<section class="template-audit ${verdict.safe ? "safe" : "unsafe"}">` +
    `<div><span class="check-kicker">${esc(t("letterPanel.sizeKicker"))}</span><h3>${esc(t("letterPanel.words", { count: stats.words }))}</h3></div>` +
    `<strong>${esc(verdict.label)}</strong>` +
    rows.map((row) => `<p class="template-check ${row.pass ? "pass" : "fail"}">${esc(row.pass ? t("checker.pass") : t("checker.fail"))} · ${esc(row.label)}</p>`).join("") +
    `</section>`;
}

export function renderLetterCheckPanel(cv, language = "id") {
  const t = translator(language);
  const report = buildLetterReport(cv, language);
  const urgent = report.findings.filter((entry) => entry.severity === "error" || entry.severity === "warning");
  const recommended = report.findings.filter((entry) => entry.severity === "recommendation");
  return {
    report,
    html: `<section class="ats-panel">` +
      `<header class="ats-heading">` +
        `<span class="check-kicker">${esc(t("checker.kicker"))}</span>` +
        `<h2>${esc(t("letterPanel.title"))}</h2>` +
        `<p>${esc(t("letterPanel.intro"))}</p>` +
      `</header>` +
      `<div class="ats-counts">` +
        `<div><strong>${report.summary.errors}</strong><span>${esc(t("checker.errors"))}</span></div>` +
        `<div><strong>${report.summary.warnings}</strong><span>${esc(t("checker.warnings"))}</span></div>` +
        `<div><strong>${report.summary.recommendations}</strong><span>${esc(t("checker.suggestions"))}</span></div>` +
      `</div>` +
      renderLetterStats(cv, report.stats, t) +
      renderFindingGroup(t("checker.fixFirst"), urgent, t("letterPanel.noFindings"), t) +
      renderFindingGroup(t("checker.suggested"), recommended, t("letterPanel.noSuggestions"), t) +
      renderKeywordSection(cv, report.keywords, t("subject.letter"), t) +
      `</section>`,
  };
}
