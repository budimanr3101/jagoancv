import { BACKUP_FORMAT, SCHEMA_VERSION, assertValidCV, normalizeCV } from "./model.js";

export class BackupValidationError extends Error {
  constructor(message, cause) {
    super(message, { cause });
    this.name = "BackupValidationError";
  }
}

export function createBackup(document, now = () => new Date()) {
  assertValidCV(document);
  return {
    format: BACKUP_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now().toISOString(),
    document,
  };
}

export function serializeBackup(document, options = {}) {
  return JSON.stringify(createBackup(document, options.now), null, 2);
}

export function parseBackupJSON(json) {
  let backup;
  try {
    backup = JSON.parse(json);
  } catch (error) {
    throw new BackupValidationError("File bukan JSON yang valid.", error);
  }
  if (!backup || typeof backup !== "object" || Array.isArray(backup)) {
    throw new BackupValidationError("Struktur cadangan tidak valid.");
  }
  if (backup.format !== BACKUP_FORMAT) {
    throw new BackupValidationError("File ini bukan cadangan CV ATS Generator.");
  }
  if (backup.schemaVersion !== SCHEMA_VERSION) {
    throw new BackupValidationError(`Versi cadangan ${backup.schemaVersion ?? "tidak diketahui"} belum didukung.`);
  }
  try {
    return normalizeCV(backup.document);
  } catch (error) {
    throw new BackupValidationError("Isi data CV tidak valid.", error);
  }
}

function slug(value) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function backupFilename(document) {
  const name = slug(document.basics.fullName || document.meta.title || "cv") || "cv";
  return `${name}-backup.json`;
}

export function downloadBackup(document, browser = globalThis) {
  const blob = new Blob([serializeBackup(document)], { type: "application/json;charset=utf-8" });
  const url = browser.URL.createObjectURL(blob);
  const anchor = browser.document.createElement("a");
  anchor.href = url;
  anchor.download = backupFilename(document);
  anchor.click();
  browser.URL.revokeObjectURL(url);
}

export async function readBackupFile(file) {
  if (!file || typeof file.text !== "function") throw new BackupValidationError("Pilih file JSON terlebih dahulu.");
  return parseBackupJSON(await file.text());
}
