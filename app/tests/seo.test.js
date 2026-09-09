import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const APP_ROOT = new URL("../", import.meta.url);
const CANONICAL_ROOT = "https://jagoancv.pages.dev/";
const CANONICAL_ENGLISH = "https://jagoancv.pages.dev/en/";
const SOCIAL_IMAGE = "https://jagoancv.pages.dev/assets/jagoancv-social.png";

const readText = async (file) => readFile(new URL(file, APP_ROOT), "utf8");

function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map((match) => [match[1], match[2]]));
}

function tags(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "gi"))].map((match) => attributes(match[0]));
}

function metaContent(html, attribute, value) {
  const meta = tags(html, "meta").find((item) => item[attribute] === value);
  assert.ok(meta, `missing meta ${attribute}=${value}`);
  assert.ok(meta.content, `meta ${attribute}=${value} has no content`);
  return meta.content;
}

function linkHref(html, rel) {
  const link = tags(html, "link").find((item) => item.rel === rel);
  assert.ok(link, `missing link rel=${rel}`);
  return link.href;
}

function languageAlternates(html) {
  return new Map(tags(html, "link")
    .filter((item) => item.rel === "alternate" && item.hreflang)
    .map((item) => [item.hreflang, item.href]));
}

function structuredData(html) {
  const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 1, "each landing must expose one JSON-LD graph");
  return JSON.parse(scripts[0][1]);
}

const pageCases = [
  {
    file: "index.html",
    canonical: CANONICAL_ROOT,
    locale: "id_ID",
    title: "JagoanCV — Generator CV ATS & Surat Lamaran Gratis",
    manifest: "./manifest.webmanifest",
  },
  {
    file: "en/index.html",
    canonical: CANONICAL_ENGLISH,
    locale: "en_US",
    title: "JagoanCV — Free ATS CV & Cover Letter Builder",
    manifest: "../manifest.webmanifest",
  },
];

test("public landings expose canonical, reciprocal language, social, and index metadata", async () => {
  for (const page of pageCases) {
    const html = await readText(page.file);
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1, `${page.file} must have one h1`);
    assert.match(html, new RegExp(`<title>${page.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}<\\/title>`));
    assert.ok(metaContent(html, "name", "description").length >= 100, `${page.file} needs a substantive description`);
    assert.equal(metaContent(html, "name", "robots"), "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1");
    assert.equal(metaContent(html, "name", "google-site-verification"), "SnXxogW2MZ6DcnUaJePP5FwgCYcGh8hF1FG7u0M5Lj4");
    assert.equal(linkHref(html, "canonical"), page.canonical);
    assert.equal(linkHref(html, "manifest"), page.manifest);
    assert.equal(tags(html, "link").filter((item) => item.rel === "icon").length, 1);
    assert.equal(tags(html, "meta").filter((item) => item.name === "theme-color").length, 2);

    const alternates = languageAlternates(html);
    assert.deepEqual(Object.fromEntries(alternates), {
      id: CANONICAL_ROOT,
      en: CANONICAL_ENGLISH,
      "x-default": CANONICAL_ROOT,
    });

    const requiredOpenGraph = ["og:type", "og:site_name", "og:locale", "og:title", "og:description", "og:url", "og:image", "og:image:type", "og:image:width", "og:image:height", "og:image:alt"];
    for (const property of requiredOpenGraph) assert.ok(metaContent(html, "property", property));
    assert.equal(metaContent(html, "property", "og:locale"), page.locale);
    assert.equal(metaContent(html, "property", "og:url"), page.canonical);
    assert.equal(metaContent(html, "property", "og:image"), SOCIAL_IMAGE);
    assert.equal(metaContent(html, "property", "og:image:width"), "1200");
    assert.equal(metaContent(html, "property", "og:image:height"), "630");

    for (const name of ["twitter:card", "twitter:title", "twitter:description", "twitter:image", "twitter:image:alt"]) assert.ok(metaContent(html, "name", name));
    assert.equal(metaContent(html, "name", "twitter:card"), "summary_large_image");
    assert.equal(metaContent(html, "name", "twitter:image"), SOCIAL_IMAGE);
  }

  const image = await readFile(new URL("assets/jagoancv-social.png", APP_ROOT));
  assert.deepEqual([...image.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], "social image must be a PNG");
  assert.equal(image.readUInt32BE(16), 1200);
  assert.equal(image.readUInt32BE(20), 630);
});

test("JSON-LD describes the real free, local-first bilingual product", async () => {
  for (const page of pageCases) {
    const graph = structuredData(await readText(page.file));
    assert.equal(graph["@context"], "https://schema.org");
    assert.ok(Array.isArray(graph["@graph"]));
    const website = graph["@graph"].find((item) => item["@type"] === "WebSite");
    const application = graph["@graph"].find((item) => item["@type"] === "SoftwareApplication");
    assert.ok(website, `${page.file} needs WebSite schema`);
    assert.ok(application, `${page.file} needs SoftwareApplication schema`);
    assert.equal(website.url, CANONICAL_ROOT);
    assert.equal(application.url, CANONICAL_ROOT);
    assert.equal(application.isAccessibleForFree, true);
    assert.equal(application.offers?.price, "0");
    assert.equal(application.offers?.priceCurrency, "IDR");
    assert.deepEqual(application.inLanguage, ["id-ID", "en"]);

    const claims = JSON.stringify(application).toLowerCase();
    const requiredClaims = [
      ["cv"], ["cover letter", "surat lamaran"], ["ats"], ["keyword"], ["pdf"],
      ["local"], ["indonesian", "bahasa indonesia"], ["english"], ["transparent", "transparan"],
    ];
    for (const alternatives of requiredClaims) {
      assert.ok(alternatives.some((claim) => claims.includes(claim)), `${page.file} schema is missing ${alternatives.join("/")}`);
    }
  }
});

test("public copy uses fictional samples and rejects unsupported marketing claims", async () => {
  const indonesian = await readText("index.html");
  const english = await readText("en/index.html");
  const combined = `${indonesian}\n${english}`;

  for (const html of [indonesian, english]) {
    assert.match(html, /Nadia Pratama/);
    assert.match(html, /nadia\.pratama@example\.com/);
    assert.match(html, /linkedin\.com\/in\/nadia-pratama/);
    assert.match(html, /https:\/\/saweria\.co\/budimanr3101/);
    const withoutSupportUrl = html.replaceAll("https://saweria.co/budimanr3101", "");
    assert.doesNotMatch(withoutSupportUrl, /Budiman|budiman/i, "real identity may appear only in the configured Saweria URL");
  }

  assert.doesNotMatch(combined, /\b(?:AI[- ]powered|powered by AI|menggunakan AI|kecerdasan buatan)\b/i);
  assert.doesNotMatch(combined, /\b(?:trusted by|dipakai oleh|digunakan oleh)\s+[\d.,+]+\s+(?:users?|pengguna)\b/i);
  assert.doesNotMatch(combined, /\b(?:guaranteed?|jaminan|pasti)\s+(?:to\s+)?(?:pass|lolos)\b/i);
  assert.doesNotMatch(combined, /\b100%\s+(?:ATS|lolos)\b/i);
  assert.match(indonesian, /bukan skor resmi vendor ATS/i);
  assert.match(english, /not an official ATS vendor score/i);
});

test("robots, sitemap, manifest, llms, and editor indexing policy stay aligned", async () => {
  const [robots, sitemap, manifestSource, llms, editor] = await Promise.all([
    readText("robots.txt"),
    readText("sitemap.xml"),
    readText("manifest.webmanifest"),
    readText("llms.txt"),
    readText("editor.html"),
  ]);

  assert.match(robots, /^User-agent: \*$/m);
  assert.match(robots, /^Allow: \/$/m);
  assert.match(robots, new RegExp(`^Sitemap: ${CANONICAL_ROOT.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}sitemap\\.xml$`, "m"));
  assert.doesNotMatch(robots, /^Disallow:\s*\/editor\.html$/m, "crawler must be able to read the editor noindex directive");

  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  assert.deepEqual(locations, [CANONICAL_ROOT, CANONICAL_ENGLISH]);
  assert.doesNotMatch(sitemap, /editor\.html/);
  assert.equal((sitemap.match(/<xhtml:link\b/g) ?? []).length, 6);
  assert.match(editor, /<meta name="robots" content="noindex,follow">/);

  const manifest = JSON.parse(manifestSource);
  assert.equal(manifest.start_url, "/editor.html");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.display, "standalone");
  assert.ok(manifest.icons.some((icon) => icon.src === "/assets/jagoancv-icon.svg"));

  assert.match(llms, /supplemental machine-readable summary/i);
  assert.match(llms, /Canonical metadata, `hreflang`, `robots\.txt`, and `sitemap\.xml` remain the standard discovery and indexing controls\./);
  assert.match(llms, /not an official score/i);
  assert.match(llms, /does not guarantee/i);
});

test("landing runtime remains local and tracker-free", async () => {
  for (const file of ["index.html", "en/index.html"]) {
    const html = await readText(file);
    const remoteScripts = tags(html, "script").filter((item) => item.src && /^(?:https?:)?\/\//.test(item.src));
    assert.deepEqual(remoteScripts, [], `${file} must not load remote scripts`);
  }
  const [css, javascript] = await Promise.all([readText("landing.css"), readText("landing.js")]);
  assert.doesNotMatch(`${css}\n${javascript}`, /@import|googletagmanager|google-analytics|segment|mixpanel|plausible|matomo|hotjar|facebook\.net/i);
  assert.match(javascript, /cv-ats-generator:theme/);
  assert.doesNotMatch(javascript, /jagoancv-landing-mockup:theme/);
});


test("hero typing is accessible progressive enhancement and loops deliberately", async () => {
  for (const file of ["index.html", "en/index.html"]) {
    const html = await readText(file);
    assert.match(html, /class="typing-text" data-typing/);
    assert.match(html, /data-typing-measure aria-hidden="true"/);
    assert.match(html, /data-typing-live aria-hidden="true"/);
    assert.match(html, /class="typing-accessible"/);
  }

  const [css, javascript] = await Promise.all([readText("landing.css"), readText("landing.js")]);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /jcv-caret-blink 500ms step-end infinite/);
  assert.match(css, /--jcv-button-bg:#bde4ef/);
  assert.match(css, /--jcv-strong-button-bg:#bde4ef/);
  assert.match(javascript, /prefers-reduced-motion: reduce/);
  assert.match(javascript, /const TYPE_DELAY = 55/);
  assert.match(javascript, /const DELETE_DELAY = 32/);
  assert.match(javascript, /const FULL_TEXT_PAUSE = 1600/);
  assert.match(javascript, /const EMPTY_TEXT_PAUSE = 450/);
  assert.doesNotMatch(javascript, /setInterval/);
});