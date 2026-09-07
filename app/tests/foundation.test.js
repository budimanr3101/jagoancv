import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  SCHEMA_VERSION, CVValidationError, createEmptyCV, createSampleCV, isCVEmpty, normalizeCV,
} from "../js/model.js";
import {
  StorageCorruptError, StorageFullError, createLocalRepository,
} from "../js/storage.js";
import {
  BackupValidationError, parseBackupJSON, serializeBackup,
} from "../js/backup.js";
import { createCVStore } from "../js/store.js";

function deterministicOptions() {
  let sequence = 0;
  return {
    idFactory: (prefix) => `${prefix}-${++sequence}`,
    now: () => new Date("2026-09-04T08:00:00.000Z"),
  };
}

function createStorage(initial = new Map()) {
  return {
    getItem: (key) => initial.has(key) ? initial.get(key) : null,
    setItem: (key, value) => initial.set(key, value),
    removeItem: (key) => initial.delete(key),
    values: initial,
  };
}

test("empty document contains every canonical collection", () => {
  const cv = createEmptyCV(deterministicOptions());
  assert.equal(cv.schemaVersion, SCHEMA_VERSION);
  assert.equal(cv.meta.locale, "id");
  assert.equal(cv.basics.links.length, 0);
  for (const key of ["experience", "education", "projects", "certifications", "skills", "languages", "awards", "volunteering"]) {
    assert.ok(Array.isArray(cv[key]), `${key} must be an array`);
  }
  assert.equal(isCVEmpty(cv), true);
});

test("sample document provides realistic data without changing the schema", () => {
  const cv = createSampleCV(deterministicOptions());
  assert.equal(cv.schemaVersion, SCHEMA_VERSION);
  assert.equal(cv.basics.fullName, "Dina Pratama");
  assert.equal(cv.experience.length, 1);
  assert.equal(cv.education.length, 1);
  assert.equal(cv.projects.length, 1);
  assert.equal(cv.certifications.length, 1);
  assert.equal(cv.skills.length, 2);
  assert.equal(isCVEmpty(cv), false);
});

test("JSON backup round-trips IDs, order, locale, and dates", () => {
  const original = createSampleCV(deterministicOptions());
  const json = serializeBackup(original, { now: () => new Date("2026-09-04T09:00:00.000Z") });
  const restored = parseBackupJSON(json);
  assert.deepEqual(restored, normalizeCV(original));
  assert.equal(JSON.parse(json).exportedAt, "2026-09-04T09:00:00.000Z");
});

test("backup parser rejects foreign, malformed, and unsupported files", () => {
  assert.throws(() => parseBackupJSON("not json"), BackupValidationError);
  assert.throws(() => parseBackupJSON(JSON.stringify({ format: "other" })), BackupValidationError);
  assert.throws(() => parseBackupJSON(JSON.stringify({ format: "cv-ats-generator", schemaVersion: 99, document: {} })), BackupValidationError);
});

test("local repository saves, loads, and clears a document", () => {
  const storage = createStorage();
  const repository = createLocalRepository(storage, "test-key");
  const cv = createEmptyCV(deterministicOptions());
  repository.save(cv);
  assert.deepEqual(repository.load(), cv);
  repository.clear();
  assert.equal(repository.load(), null);
});

test("local repository reports corrupt JSON explicitly", () => {
  const storage = createStorage(new Map([["test-key", "{broken"]]));
  const repository = createLocalRepository(storage, "test-key");
  assert.throws(() => repository.load(), StorageCorruptError);
});

test("local repository turns quota failures into StorageFullError", () => {
  const storage = {
    getItem: () => null,
    removeItem: () => {},
    setItem: () => { const error = new Error("quota"); error.name = "QuotaExceededError"; throw error; },
  };
  const repository = createLocalRepository(storage, "test-key");
  assert.throws(() => repository.save(createEmptyCV(deterministicOptions())), StorageFullError);
});

test("store marks edits pending and flushes them to the repository", () => {
  let persisted = null;
  const repository = { save: (value) => { persisted = value; }, clear: () => {} };
  const now = () => new Date("2026-09-04T10:00:00.000Z");
  const store = createCVStore({
    document: createEmptyCV(deterministicOptions()), repository, now, debounceMs: 60_000,
  });
  store.update((cv) => { cv.meta.title = "Cloud Engineer CV"; });
  assert.equal(store.getState().save.status, "pending");
  assert.equal(store.flush(), true);
  assert.equal(store.getState().save.status, "saved");
  assert.equal(persisted.meta.title, "Cloud Engineer CV");
  assert.equal(persisted.meta.updatedAt, "2026-09-04T10:00:00.000Z");
  store.destroy();
});

test("store exposes save failure and keeps the in-memory document", () => {
  const repository = { save: () => { throw new StorageFullError(); }, clear: () => {} };
  const store = createCVStore({
    document: createEmptyCV(deterministicOptions()), repository, debounceMs: 60_000,
  });
  store.update((cv) => { cv.meta.title = "Tetap di memori"; });
  assert.equal(store.flush(), false);
  assert.equal(store.getState().save.status, "error");
  assert.equal(store.getState().cv.meta.title, "Tetap di memori");
  store.destroy();
});

test("invalid replacement is rejected before active data changes", () => {
  const repository = { save: () => {}, clear: () => {} };
  const store = createCVStore({ document: createSampleCV(deterministicOptions()), repository });
  const before = store.getState().cv;
  assert.throws(() => store.replace({ schemaVersion: SCHEMA_VERSION }), CVValidationError);
  assert.deepEqual(store.getState().cv, before);
  store.destroy();
});

test("browser shell exposes essential controls without JSON backup or network client", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const main = await readFile(new URL("../js/editor-main.js", import.meta.url), "utf8");
  for (const id of ["sample-button", "clear-button", "pdf-button", "theme-select", "save-state"]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.doesNotMatch(html, /id=["'](?:export-button|import-input)["']/);
  assert.doesNotMatch(main, /\b(?:fetch|XMLHttpRequest|WebSocket)\b/);
});


test("support link opens the configured Saweria page without a referrer", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /href="https:\/\/saweria\.co\/budimanr3101"/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, /referrerpolicy="no-referrer"/);
  assert.match(html, /<strong>Thanks to me<\/strong>/);
});


test("production shell uses the SiapLamar brand and approved Dokumen Siap icon", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const icon = await readFile(new URL("../assets/siaplamar-icon.svg", import.meta.url), "utf8");
  assert.match(html, /<title>SiapLamar — CV ATS Generator<\/title>/);
  assert.match(html, /rel="icon"[^>]+href="\.\/assets\/siaplamar-icon\.svg"/);
  assert.match(html, /class="brand-mark"[^>]+src="\.\/assets\/siaplamar-icon\.svg"/);
  assert.match(html, /<strong>SiapLamar<\/strong>/);
  assert.doesNotMatch(html, /RapiCV/);
  assert.match(icon, /<title id="title">SiapLamar — Dokumen Siap<\/title>/);
  assert.match(icon, /id="document"/);
  assert.match(icon, /id="forward-check"/);
});
