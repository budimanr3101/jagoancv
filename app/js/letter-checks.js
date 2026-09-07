import { fill } from "./editor-copy.js";

const severityOrder = { error: 0, warning: 1, recommendation: 2, info: 3 };
const text = (value) => typeof value === "string" ? value.trim() : "";
const countWords = (value) => value.split(/\s+/).filter(Boolean).length;

export const LETTER_LENGTH = Object.freeze({ min: 120, max: 400, paragraphMax: 120 });

export const LETTER_FINDING_COPY = Object.freeze({
  id: {
    "SL-001": { title: "Isi surat belum ada", message: "Tulis minimal satu paragraf yang menjelaskan alasan Anda melamar." },
    "SL-002": { title: "Nama penanda tangan belum ada", message: "Isi nama lengkap pada langkah Data diri agar surat dapat ditandatangani." },
    "SL-003": { title: "Kontak belum ada", message: "Tambahkan email atau nomor telepon aktif agar recruiter dapat menghubungi Anda." },
    "SL-004": { title: "Sapaan belum ada", message: "Tambahkan sapaan pembuka, misalnya “Dengan hormat,”." },
    "SL-005": { title: "Penutup belum ada", message: "Tambahkan penutup, misalnya “Hormat saya,”, sebelum nama Anda." },
    "SL-006": { title: "Posisi target belum diisi", message: "Isi posisi target di panel Sesuai lowongan agar surat menyebut lowongan yang dilamar." },
    "SL-007": { title: "Posisi tidak disebut di isi surat", message: "Sebut “{role}” pada paragraf pembuka agar surat tidak terasa generik." },
    "SL-008": { title: "Perusahaan tidak disebut", message: "Menyebut {company} menunjukkan surat ini ditulis khusus untuk lowongan tersebut." },
    "SL-009": { title: "Surat terlalu pendek ({words} kata)", message: "Target {min}–{max} kata agar alasan melamar cukup jelas." },
    "SL-010": { title: "Surat terlalu panjang ({words} kata)", message: "Di atas {max} kata biasanya melewati satu halaman. Ringkas bagian yang hanya mengulang CV." },
    "SL-011": { title: "Baru {paragraphs} paragraf", message: "Tiga paragraf memudahkan pembaca: alasan melamar, bukti pengalaman, lalu penutup." },
    "SL-012": { title: "Ada paragraf sepanjang {words} kata", message: "Pecah paragraf panjang agar lebih mudah dipindai recruiter." },
    "SL-013": { title: "Belum ada bukti terukur", message: "Tambahkan angka konkret, misalnya jumlah workload, persentase perbaikan, atau durasi proyek." },
    "SL-014": { title: "Kota atau tanggal belum lengkap", message: "Banyak perusahaan di Indonesia mengharapkan baris kota dan tanggal pada surat lamaran." },
  },
  en: {
    "SL-001": { title: "The letter has no body yet", message: "Write at least one paragraph explaining why you are applying." },
    "SL-002": { title: "No name for the signature", message: "Fill in your full name in the Your details step so the letter can be signed." },
    "SL-003": { title: "No contact details", message: "Add a working email address or phone number so the recruiter can reach you." },
    "SL-004": { title: "No greeting", message: "Add an opening greeting, for example “Dear Hiring Manager,”." },
    "SL-005": { title: "No closing", message: "Add a closing such as “Sincerely,” above your name." },
    "SL-006": { title: "No target role set", message: "Set the target role in the job-match panel so the letter names the vacancy." },
    "SL-007": { title: "The role is not mentioned in the body", message: "Mention “{role}” in the opening paragraph so the letter does not read as generic." },
    "SL-008": { title: "The company is not mentioned", message: "Naming {company} shows the letter was written for this specific vacancy." },
    "SL-009": { title: "The letter is too short ({words} words)", message: "Aim for {min}–{max} words so your reasons come across clearly." },
    "SL-010": { title: "The letter is too long ({words} words)", message: "Beyond {max} words it usually spills past one page. Trim whatever only repeats the CV." },
    "SL-011": { title: "Only {paragraphs} paragraphs so far", message: "Three paragraphs read best: why you are applying, your evidence, then the close." },
    "SL-012": { title: "One paragraph runs to {words} words", message: "Break up long paragraphs so a recruiter can scan them." },
    "SL-013": { title: "No measurable evidence yet", message: "Add concrete numbers, such as how many workloads, what percentage improved, or how long it took." },
    "SL-014": { title: "City or date is incomplete", message: "Many Indonesian employers expect a city and date line on a cover letter." },
  },
});

export function coverLetterStats(cv) {
  const paragraphs = (cv.coverLetter?.paragraphs ?? []).map(text).filter(Boolean);
  const body = paragraphs.join(" ");
  const perParagraph = paragraphs.map(countWords);
  return {
    body,
    paragraphs: paragraphs.length,
    words: countWords(body),
    longestParagraph: perParagraph.length ? Math.max(...perParagraph) : 0,
  };
}

export function runCoverLetterChecks(cv, language = "id") {
  const copy = LETTER_FINDING_COPY[language] ?? LETTER_FINDING_COPY.id;
  const letter = cv.coverLetter ?? {};
  const stats = coverLetterStats(cv);
  const bodyLower = stats.body.toLowerCase();
  const results = [];
  const add = (id, severity, category, vars = {}, extra = {}) => {
    const entry = copy[id] ?? LETTER_FINDING_COPY.id[id];
    results.push({
      id, severity, category,
      title: fill(entry.title, vars),
      message: fill(entry.message, vars),
      ...extra,
    });
  };

  if (!stats.paragraphs) add("SL-001", "error", "content");
  if (!text(cv.basics.fullName)) add("SL-002", "error", "contact", {}, { step: "basics" });
  if (!text(cv.basics.email) && !text(cv.basics.phone)) add("SL-003", "error", "contact", {}, { step: "basics" });
  if (!text(letter.greeting)) add("SL-004", "warning", "structure");
  if (!text(letter.closing)) add("SL-005", "warning", "structure");

  const role = text(cv.targetJob.title);
  if (!role) add("SL-006", "warning", "alignment");
  else if (stats.paragraphs && !bodyLower.includes(role.toLowerCase())) add("SL-007", "warning", "alignment", { role });

  const company = text(cv.targetJob.company);
  if (company && stats.paragraphs && !bodyLower.includes(company.toLowerCase())) {
    add("SL-008", "recommendation", "alignment", { company });
  }

  if (stats.paragraphs && stats.words < LETTER_LENGTH.min) {
    add("SL-009", "warning", "length", { words: stats.words, min: LETTER_LENGTH.min, max: LETTER_LENGTH.max });
  }
  if (stats.words > LETTER_LENGTH.max) {
    add("SL-010", "warning", "length", { words: stats.words, max: LETTER_LENGTH.max });
  }
  if (stats.paragraphs && stats.paragraphs < 3) add("SL-011", "recommendation", "structure", { paragraphs: stats.paragraphs });
  if (stats.longestParagraph > LETTER_LENGTH.paragraphMax) {
    add("SL-012", "recommendation", "readability", { words: stats.longestParagraph });
  }
  if (stats.paragraphs && !/\d/.test(stats.body)) add("SL-013", "recommendation", "content");
  if (!text(letter.city) || !text(letter.date)) add("SL-014", "recommendation", "structure");

  return results.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}
