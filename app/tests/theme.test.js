import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  THEME_STORAGE_KEY,
  applyThemePreference,
  normalizeThemePreference,
  setupThemeControl,
} from "../js/theme.js";

function createStorage(initial = new Map()) {
  return {
    getItem: (key) => initial.has(key) ? initial.get(key) : null,
    setItem: (key, value) => initial.set(key, value),
    removeItem: (key) => initial.delete(key),
    values: initial,
  };
}

function createRoot() {
  const attributes = new Map();
  return {
    setAttribute: (name, value) => attributes.set(name, value),
    removeAttribute: (name) => attributes.delete(name),
    getAttribute: (name) => attributes.get(name) ?? null,
  };
}

function createSelect() {
  const listeners = new Map();
  return {
    value: "",
    addEventListener: (type, listener) => listeners.set(type, listener),
    removeEventListener: (type) => listeners.delete(type),
    change(value) {
      this.value = value;
      listeners.get("change")?.({ target: this });
    },
  };
}

function createWindow() {
  const listeners = new Map();
  return {
    addEventListener: (type, listener) => listeners.set(type, listener),
    removeEventListener: (type) => listeners.delete(type),
    dispatchStorage(event) { listeners.get("storage")?.(event); },
  };
}

test("theme preference accepts only system, light, and dark", () => {
  assert.equal(normalizeThemePreference("system"), "system");
  assert.equal(normalizeThemePreference("light"), "light");
  assert.equal(normalizeThemePreference("dark"), "dark");
  assert.equal(normalizeThemePreference("unknown"), "system");
  assert.equal(applyThemePreference(null, "dark"), "dark");
});

test("theme control loads, persists, and clears an explicit preference", () => {
  const storage = createStorage(new Map([[THEME_STORAGE_KEY, "dark"]]));
  const root = createRoot();
  const select = createSelect();
  const controller = setupThemeControl({ select, root, storage, windowRef: null });

  assert.equal(controller.preference, "dark");
  assert.equal(select.value, "dark");
  assert.equal(root.getAttribute("data-theme"), "dark");

  select.change("light");
  assert.equal(root.getAttribute("data-theme"), "light");
  assert.equal(storage.values.get(THEME_STORAGE_KEY), "light");

  select.change("system");
  assert.equal(root.getAttribute("data-theme"), null);
  assert.equal(storage.values.has(THEME_STORAGE_KEY), false);
  controller.destroy();
});

test("theme control follows preference changes from another tab", () => {
  const storage = createStorage();
  const root = createRoot();
  const select = createSelect();
  const windowRef = createWindow();
  setupThemeControl({ select, root, storage, windowRef });

  windowRef.dispatchStorage({ key: THEME_STORAGE_KEY, newValue: "dark" });
  assert.equal(root.getAttribute("data-theme"), "dark");
  assert.equal(select.value, "dark");

  windowRef.dispatchStorage({ key: THEME_STORAGE_KEY, newValue: null });
  assert.equal(root.getAttribute("data-theme"), null);
  assert.equal(select.value, "system");
});

test("theme switching still works when local storage is unavailable", () => {
  const storage = {
    getItem: () => { throw new Error("blocked"); },
    setItem: () => { throw new Error("blocked"); },
    removeItem: () => { throw new Error("blocked"); },
  };
  const root = createRoot();
  const select = createSelect();
  setupThemeControl({ select, root, storage, windowRef: null });
  assert.equal(select.value, "system");
  select.change("dark");
  assert.equal(root.getAttribute("data-theme"), "dark");
});

test("CSS supports system dark mode while CV preview and print stay white", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(css, /:root\[data-theme="dark"\]/);
  assert.match(css, /@media\(prefers-color-scheme:dark\)/);
  assert.match(css, /\.cv-document\{[^}]*background:#fff/);
  assert.match(css, /\.print-root \.cv-document\{[^}]*background:#fff!important/);
});
