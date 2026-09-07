import { assertValidCV, cloneCV, normalizeCV, touchCV } from "./model.js";

export function createCVStore({
  document,
  repository,
  debounceMs = 500,
  now = () => new Date(),
  setTimer = globalThis.setTimeout,
  clearTimer = globalThis.clearTimeout,
}) {
  assertValidCV(document);
  let cv = normalizeCV(document);
  let timer = null;
  let save = { status: "idle", lastSavedAt: null, message: "Belum ada perubahan" };
  const listeners = new Set();

  const snapshot = () => ({ cv: cloneCV(cv), save: { ...save } });
  const emit = () => {
    const state = snapshot();
    for (const listener of listeners) listener(state);
  };

  const saveNow = () => {
    if (timer !== null) {
      clearTimer(timer);
      timer = null;
    }
    try {
      repository.save(cv);
      const timestamp = now().toISOString();
      save = { status: "saved", lastSavedAt: timestamp, message: "Tersimpan di perangkat" };
    } catch (error) {
      save = { status: "error", lastSavedAt: save.lastSavedAt, message: error.message, error };
    }
    emit();
    return save.status === "saved";
  };

  const scheduleSave = () => {
    if (timer !== null) clearTimer(timer);
    save = { ...save, status: "pending", message: "Menyimpan…" };
    emit();
    timer = setTimer(saveNow, debounceMs);
  };

  return {
    getState: snapshot,
    subscribe(listener) {
      listeners.add(listener);
      listener(snapshot());
      return () => listeners.delete(listener);
    },
    update(mutator) {
      const draft = cloneCV(cv);
      const result = mutator(draft);
      cv = touchCV(normalizeCV(result ?? draft), now().toISOString());
      scheduleSave();
      return snapshot();
    },
    replace(nextDocument, { persist = true } = {}) {
      cv = touchCV(normalizeCV(nextDocument), now().toISOString());
      if (persist) scheduleSave();
      else emit();
      return snapshot();
    },
    flush: saveNow,
    clearPersisted() {
      if (timer !== null) {
        clearTimer(timer);
        timer = null;
      }
      repository.clear();
      save = { status: "idle", lastSavedAt: null, message: "Data lokal dikosongkan" };
      emit();
    },
    destroy() {
      if (timer !== null) clearTimer(timer);
      timer = null;
      listeners.clear();
    },
  };
}
