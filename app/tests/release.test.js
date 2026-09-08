import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  buildRelease,
  RELEASE_ENTRY_FILES,
  REQUIRED_RELEASE_FILES,
} from "../../scripts/build-release.mjs";

async function listFiles(directory, prefix = "") {
  const files = [];
  for (const entry of await readdir(join(directory, prefix), { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...await listFiles(directory, relative));
    else files.push(relative);
  }
  return files.sort();
}

test("clean release follows all public entry points and production dependencies", async (context) => {
  const temporary = await mkdtemp(join(tmpdir(), "jagoancv-release-"));
  const outputDir = join(temporary, "site");
  context.after(() => rm(temporary, { recursive: true, force: true }));

  assert.deepEqual(RELEASE_ENTRY_FILES, [
    "index.html",
    "en/index.html",
    "editor.html",
    "google7f896f545cabed35.html",
    "robots.txt",
    "sitemap.xml",
    "manifest.webmanifest",
    "llms.txt",
  ]);

  const first = await buildRelease({ outputDir, silent: true });
  assert.equal(
    await readFile(join(outputDir, "google7f896f545cabed35.html"), "utf8"),
    "google-site-verification: google7f896f545cabed35.html\n",
  );
  assert.deepEqual(await listFiles(outputDir), first.files);
  for (const required of REQUIRED_RELEASE_FILES) assert.ok(first.files.includes(required), `missing ${required}`);

  for (const transitiveModule of [
    "js/ats-checker.js",
    "js/ats-score.js",
    "js/checker-view.js",
    "js/editor-copy.js",
    "js/i18n.js",
    "js/pdf-export.js",
    "js/preview.js",
  ]) {
    assert.ok(first.files.includes(transitiveModule), `import graph missed ${transitiveModule}`);
  }

  for (const sourceOnly of [
    "assets/jagoancv-social.svg",
    "js/backup.js",
    "js/main.js",
  ]) {
    assert.ok(!first.files.includes(sourceOnly), `clean release should exclude ${sourceOnly}`);
  }
  assert.ok(first.files.every((file) => !file.startsWith("tests/") && !file.startsWith("sketches/")));

  const landing = await readFile(join(outputDir, "index.html"), "utf8");
  const english = await readFile(join(outputDir, "en/index.html"), "utf8");
  const editor = await readFile(join(outputDir, "editor.html"), "utf8");
  assert.match(landing, /href="\.\/editor\.html"/);
  assert.match(english, /href="\.\.\/editor\.html"/);
  assert.match(editor, /src="\.\/js\/editor-main\.js"/);

  await writeFile(join(outputDir, "stale.txt"), "must be removed");
  const second = await buildRelease({ outputDir, silent: true });
  assert.deepEqual(second.files, first.files);
  await assert.rejects(access(join(outputDir, "stale.txt")), "a rebuild must remove stale files");
});
