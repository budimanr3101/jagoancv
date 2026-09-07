export const DEFAULT_STORAGE_KEY = "cv-ats-generator:document:v1";

export class StorageFullError extends Error {
  constructor(message = "Penyimpanan browser penuh. Kosongkan data yang tidak diperlukan sebelum melanjutkan.", cause) {
    super(message, { cause });
    this.name = "StorageFullError";
  }
}

export class StorageAccessError extends Error {
  constructor(message = "Penyimpanan browser tidak dapat diakses.", cause) {
    super(message, { cause });
    this.name = "StorageAccessError";
  }
}

export class StorageCorruptError extends Error {
  constructor(message = "Data lokal rusak dan tidak dapat dibaca.", cause) {
    super(message, { cause });
    this.name = "StorageCorruptError";
  }
}

function isQuotaError(error) {
  return error?.name === "QuotaExceededError" || error?.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    error?.code === 22 || error?.code === 1014;
}

export function createLocalRepository(storage = globalThis.localStorage, key = DEFAULT_STORAGE_KEY) {
  if (!storage) throw new StorageAccessError("Browser ini tidak menyediakan localStorage.");
  return {
    key,
    load() {
      let raw;
      try {
        raw = storage.getItem(key);
      } catch (error) {
        throw new StorageAccessError(undefined, error);
      }
      if (raw === null) return null;
      try {
        return JSON.parse(raw);
      } catch (error) {
        throw new StorageCorruptError(undefined, error);
      }
    },
    save(document) {
      try {
        storage.setItem(key, JSON.stringify(document));
      } catch (error) {
        if (isQuotaError(error)) throw new StorageFullError(undefined, error);
        throw new StorageAccessError(undefined, error);
      }
    },
    clear() {
      try {
        storage.removeItem(key);
      } catch (error) {
        throw new StorageAccessError(undefined, error);
      }
    },
  };
}
