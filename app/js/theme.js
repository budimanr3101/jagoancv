export const THEME_STORAGE_KEY = "cv-ats-generator:theme";
export const THEME_PREFERENCES = Object.freeze(["system", "light", "dark"]);

export function normalizeThemePreference(value) {
  return THEME_PREFERENCES.includes(value) ? value : "system";
}

function browserStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function readThemePreference(storage = browserStorage()) {
  try {
    return normalizeThemePreference(storage?.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

export function applyThemePreference(root, preference) {
  const normalized = normalizeThemePreference(preference);
  if (!root) return normalized;
  if (normalized === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", normalized);
  return normalized;
}

export function persistThemePreference(storage, preference) {
  const normalized = normalizeThemePreference(preference);
  try {
    if (normalized === "system") storage?.removeItem(THEME_STORAGE_KEY);
    else storage?.setItem(THEME_STORAGE_KEY, normalized);
  } catch {
    // Theme switching must keep working when browser storage is unavailable.
  }
  return normalized;
}

export function setupThemeControl({
  select = globalThis.document?.getElementById("theme-select"),
  root = globalThis.document?.documentElement,
  storage = browserStorage(),
  windowRef = globalThis.window,
} = {}) {
  let current = applyThemePreference(root, readThemePreference(storage));
  if (select) select.value = current;

  const handleChange = (event) => {
    current = persistThemePreference(storage, event.target.value);
    applyThemePreference(root, current);
    if (select) select.value = current;
  };

  const handleStorage = (event) => {
    if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
    current = applyThemePreference(root, normalizeThemePreference(event.newValue));
    if (select) select.value = current;
  };

  select?.addEventListener("change", handleChange);
  windowRef?.addEventListener?.("storage", handleStorage);

  return {
    get preference() { return current; },
    destroy() {
      select?.removeEventListener("change", handleChange);
      windowRef?.removeEventListener?.("storage", handleStorage);
    },
  };
}
