import { copyFile, lstat, mkdir, readFile, rm } from "node:fs/promises";
import { dirname, isAbsolute, join, parse, relative, resolve, sep } from "node:path";
import { posix } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const PROJECT_ROOT = resolve(dirname(SCRIPT_PATH), "..");
const DEFAULT_SOURCE_DIR = join(PROJECT_ROOT, "app");
const DEFAULT_OUTPUT_DIR = join(PROJECT_ROOT, "dist");
const CANONICAL_ORIGIN = "https://jagoancv.pages.dev";

export const RELEASE_ENTRY_FILES = Object.freeze([
  "index.html",
  "en/index.html",
  "editor.html",
  "google7f896f545cabed35.html",
  "robots.txt",
  "sitemap.xml",
  "manifest.webmanifest",
  "llms.txt",
]);

export const REQUIRED_RELEASE_FILES = Object.freeze([
  ...RELEASE_ENTRY_FILES,
  "landing.css",
  "landing.js",
  "styles.css",
  "editorial-split.css",
  "assets/jagoancv-icon.svg",
  "assets/jagoancv-social.png",
  "js/editor-main.js",
]);

const BLOCKED_RELEASE_PREFIXES = ["tests/", "sketches/", ".wrangler/"];

function toPosix(filePath) {
  return filePath.split(sep).join("/");
}

function assertSafeRelative(filePath) {
  if (!filePath || isAbsolute(filePath) || filePath === ".." || filePath.startsWith("../")) {
    throw new Error(`Release graph escaped the source directory: ${filePath}`);
  }
  if (BLOCKED_RELEASE_PREFIXES.some((prefix) => filePath.startsWith(prefix))) {
    throw new Error(`Release graph included a non-production path: ${filePath}`);
  }
}

function resolveLocalReference(reference, fromFile) {
  const raw = reference.trim().replace(/^['"]|['"]$/g, "");
  if (!raw || raw.startsWith("#") || raw.startsWith("//")) return null;
  if (/^(?:data|mailto|tel|javascript):/i.test(raw)) return null;

  let pathPart;
  let directoryReference = false;

  if (/^https?:/i.test(raw)) {
    const url = new URL(raw);
    if (url.origin !== CANONICAL_ORIGIN) return null;
    pathPart = decodeURIComponent(url.pathname);
    directoryReference = pathPart.endsWith("/");
  } else {
    const withoutFragment = raw.split("#", 1)[0].split("?", 1)[0];
    if (!withoutFragment || /[\s<>]/.test(withoutFragment) || /^[a-z][a-z\d+.-]*:/i.test(withoutFragment)) return null;
    directoryReference = withoutFragment.endsWith("/");
    pathPart = withoutFragment.startsWith("/")
      ? withoutFragment
      : posix.join(posix.dirname(fromFile), withoutFragment);
  }

  let normalized = posix.normalize(`/${pathPart}`).replace(/^\/+/, "");
  if (!normalized || normalized === ".") normalized = "index.html";
  else if (directoryReference) normalized = posix.join(normalized, "index.html");
  assertSafeRelative(normalized);
  return normalized;
}

function htmlReferences(source) {
  const references = [];
  for (const match of source.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)) references.push(match[1]);
  for (const match of source.matchAll(/\bcontent=["'](https:\/\/jagoancv\.pages\.dev\/[^"']*)["']/gi)) references.push(match[1]);
  for (const match of source.matchAll(/\bsrcset=["']([^"']+)["']/gi)) {
    for (const candidate of match[1].split(",")) references.push(candidate.trim().split(/\s+/, 1)[0]);
  }
  return references;
}

function cssReferences(source) {
  const references = [];
  for (const match of source.matchAll(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi)) references.push(match[2]);
  for (const match of source.matchAll(/@import\s+(?:url\()?\s*["']([^"']+)["']/gi)) references.push(match[1]);
  return references;
}

function javascriptReferences(source) {
  const references = [];
  for (const match of source.matchAll(/\b(?:import|export)\s+(?:[^"']*?\sfrom\s*)?["']([^"']+)["']/g)) references.push(match[1]);
  for (const match of source.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g)) references.push(match[1]);
  return references;
}

function manifestReferences(source) {
  const manifest = JSON.parse(source);
  const references = [];
  if (typeof manifest.start_url === "string") references.push(manifest.start_url);
  for (const icon of manifest.icons ?? []) if (typeof icon.src === "string") references.push(icon.src);
  for (const shortcut of manifest.shortcuts ?? []) {
    if (typeof shortcut.url === "string") references.push(shortcut.url);
    for (const icon of shortcut.icons ?? []) if (typeof icon.src === "string") references.push(icon.src);
  }
  return references;
}

function referencesFor(filePath, source) {
  if (filePath.endsWith(".html")) return htmlReferences(source);
  if (filePath.endsWith(".css")) return cssReferences(source);
  if (filePath.endsWith(".js") || filePath.endsWith(".mjs")) return javascriptReferences(source);
  if (filePath.endsWith(".webmanifest")) return manifestReferences(source);
  return [];
}

async function assertSourceFile(sourceDir, filePath) {
  const absolutePath = resolve(sourceDir, filePath);
  const sourceRoot = `${resolve(sourceDir)}${sep}`;
  if (!absolutePath.startsWith(sourceRoot)) throw new Error(`Unsafe source path: ${filePath}`);
  let stats;
  try {
    stats = await lstat(absolutePath);
  } catch {
    throw new Error(`Release dependency does not exist: ${filePath}`);
  }
  if (!stats.isFile() || stats.isSymbolicLink()) throw new Error(`Release dependency must be a regular file: ${filePath}`);
  return absolutePath;
}

export async function discoverReleaseFiles({ sourceDir = DEFAULT_SOURCE_DIR } = {}) {
  const queue = [...RELEASE_ENTRY_FILES];
  const files = new Set();

  while (queue.length) {
    const filePath = toPosix(queue.shift());
    assertSafeRelative(filePath);
    if (files.has(filePath)) continue;

    const absolutePath = await assertSourceFile(sourceDir, filePath);
    files.add(filePath);

    const extension = posix.extname(filePath);
    if (![".html", ".css", ".js", ".mjs", ".webmanifest"].includes(extension)) continue;
    const source = await readFile(absolutePath, "utf8");
    for (const reference of referencesFor(filePath, source)) {
      const dependency = resolveLocalReference(reference, filePath);
      if (dependency && !files.has(dependency)) queue.push(dependency);
    }
  }

  const sorted = [...files].sort();
  for (const required of REQUIRED_RELEASE_FILES) {
    if (!files.has(required)) throw new Error(`Required release file was not discovered: ${required}`);
  }
  if (sorted.some((filePath) => filePath === "assets/jagoancv-social.svg" || filePath.startsWith("tests/"))) {
    throw new Error("Release graph contains source-only or test files");
  }
  return sorted;
}

function assertSafeOutput(sourceDir, outputDir) {
  const source = resolve(sourceDir);
  const output = resolve(outputDir);
  const filesystemRoot = parse(output).root;
  if (output === filesystemRoot || output === PROJECT_ROOT || output === source || output.startsWith(`${source}${sep}`)) {
    throw new Error(`Refusing unsafe release output directory: ${output}`);
  }
}

export async function buildRelease({ sourceDir = DEFAULT_SOURCE_DIR, outputDir = DEFAULT_OUTPUT_DIR, silent = false } = {}) {
  assertSafeOutput(sourceDir, outputDir);
  const files = await discoverReleaseFiles({ sourceDir });
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  for (const filePath of files) {
    const sourcePath = await assertSourceFile(sourceDir, filePath);
    const outputPath = resolve(outputDir, filePath);
    const outputRoot = `${resolve(outputDir)}${sep}`;
    if (!outputPath.startsWith(outputRoot)) throw new Error(`Unsafe release destination: ${filePath}`);
    await mkdir(dirname(outputPath), { recursive: true });
    await copyFile(sourcePath, outputPath);
  }

  if (!silent) {
    console.log(`Built clean release: ${relative(PROJECT_ROOT, resolve(outputDir)) || "."}`);
    console.log(`Included ${files.length} files from ${RELEASE_ENTRY_FILES.length} public entry points.`);
    for (const filePath of files) console.log(`- ${filePath}`);
  }
  return { files, outputDir: resolve(outputDir) };
}

if (process.argv[1] && resolve(process.argv[1]) === SCRIPT_PATH) {
  buildRelease().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
