import { cloneCV, createId } from "./model.js";

export const COLLECTION_KEYS = [
  "links", "experience", "education", "skills", "projects",
  "certifications", "languages", "awards", "volunteering",
];

const prefixes = {
  links: "link", experience: "exp", education: "edu", skills: "skill",
  projects: "project", certifications: "cert", languages: "lang",
  awards: "award", volunteering: "volunteer",
};

function collectionOf(document, key) {
  if (!COLLECTION_KEYS.includes(key)) throw new Error(`Unknown collection: ${key}`);
  return key === "links" ? document.basics.links : document[key];
}

export function createCollectionEntry(key, idFactory = createId) {
  const id = idFactory(prefixes[key]);
  switch (key) {
    case "links": return { id, label: "", url: "" };
    case "experience": return { id, role: "", organization: "", location: "", startDate: "", endDate: "", current: false, bullets: [] };
    case "education": return { id, qualification: "", field: "", institution: "", location: "", startDate: "", endDate: "", bullets: [] };
    case "skills": return { id, name: "", items: [] };
    case "projects": return { id, name: "", role: "", startDate: "", endDate: "", url: "", bullets: [] };
    case "certifications": return { id, name: "", issuer: "", date: "", credentialId: "", url: "" };
    case "languages": return { id, name: "", proficiency: "" };
    case "awards": return { id, title: "", issuer: "", date: "", description: "" };
    case "volunteering": return { id, role: "", organization: "", startDate: "", endDate: "", bullets: [] };
    default: throw new Error(`Unknown collection: ${key}`);
  }
}

export function addEntry(document, key, { idFactory = createId, index } = {}) {
  const next = cloneCV(document);
  const collection = collectionOf(next, key);
  const entry = createCollectionEntry(key, idFactory);
  const target = Number.isInteger(index) ? Math.max(0, Math.min(index, collection.length)) : collection.length;
  collection.splice(target, 0, entry);
  return next;
}

export function removeEntry(document, key, id) {
  const next = cloneCV(document);
  const collection = collectionOf(next, key);
  const index = collection.findIndex((item) => item.id === id);
  if (index >= 0) collection.splice(index, 1);
  return next;
}

export function duplicateEntry(document, key, id, { idFactory = createId } = {}) {
  const next = cloneCV(document);
  const collection = collectionOf(next, key);
  const index = collection.findIndex((item) => item.id === id);
  if (index < 0) return next;
  const copy = cloneCV(collection[index]);
  copy.id = idFactory(prefixes[key]);
  collection.splice(index + 1, 0, copy);
  return next;
}

export function moveEntry(document, key, id, direction) {
  if (!["up", "down"].includes(direction)) throw new Error(`Unknown direction: ${direction}`);
  const next = cloneCV(document);
  const collection = collectionOf(next, key);
  const from = collection.findIndex((item) => item.id === id);
  if (from < 0) return next;
  const to = direction === "up" ? from - 1 : from + 1;
  if (to < 0 || to >= collection.length) return next;
  const [entry] = collection.splice(from, 1);
  collection.splice(to, 0, entry);
  return next;
}

export function updateEntry(document, key, id, field, value) {
  const next = cloneCV(document);
  const entry = collectionOf(next, key).find((item) => item.id === id);
  if (!entry || !(field in entry) || field === "id") return next;
  entry[field] = value;
  return next;
}
