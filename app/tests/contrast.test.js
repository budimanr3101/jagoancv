import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const CSS = new URL("../styles.css", import.meta.url);

// WCAG relative luminance / contrast, so the guard proves the ratio rather than
// trusting a colour name.
function luminance(hex) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(full.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function tokens(css, scope) {
  if (scope === ":root") {
    // Light-mode values live in plain :root blocks; drop both dark override forms
    // (the [data-theme="dark"] block and the prefers-color-scheme media block),
    // then take each variable's first remaining declaration.
    const light = css
      .replace(/:root\[data-theme[^{]*\{[^}]*\}/g, "")
      .replace(/@media\(prefers-color-scheme:dark\)\{[\s\S]*?\}\}/g, "");
    const grab = (name) => light.match(new RegExp(`--${name}:(#[0-9a-fA-F]{3,6})`))[1];
    return { ink: grab("ink"), muted: grab("muted"), surface: grab("surface"), page: grab("page") };
  }
  const block = css.match(new RegExp(`${scope.replace(/[.[\]()]/g, "\\$&")}\\{([^}]*)\\}`))[1];
  const grab = (name) => block.match(new RegExp(`--${name}:(#[0-9a-fA-F]{3,6})`))[1];
  return { ink: grab("ink"), muted: grab("muted"), surface: grab("surface"), page: grab("page") };
}

// The seven text colours the review flagged, and the theme token each now uses.
const FIXED = {
  ".secondary-action": "ink",
  ".optional-intro": "muted",
  ".score-method summary": "muted",
  ".dismissed-keywords summary": "muted",
  ".template-check": "muted",
  ".alignment-empty": "muted",
  ".score-check": "muted",
  ".quality-hint": "muted",
};
// The exact hardcoded values that used to fail; none may reappear as a text colour.
const BANNED = ["#213348", "#40566d", "#4b5c6e", "#4d5b69", "#4e5d6d", "#52606e", "#536d63"];

test("the seven flagged colours are gone and their selectors use a theme token", async () => {
  const css = await readFile(CSS, "utf8");
  for (const value of BANNED) {
    assert.doesNotMatch(css, new RegExp(`color:${value}`, "i"),
      `${value} was a dark-mode contrast failure and must not return as a text colour`);
  }
  for (const [selector, token] of Object.entries(FIXED)) {
    // the effective (last-declared) colour for the selector must be the theme token
    const rules = [...css.matchAll(new RegExp(`${selector.replace(/[.[\]()]/g, "\\$&")}\\{[^}]*\\}`, "g"))];
    const withColor = rules.map((m) => m[0]).filter((r) => /color:/.test(r));
    const last = withColor[withColor.length - 1];
    assert.match(last, new RegExp(`color:var\\(--${token}\\)`),
      `${selector} must resolve to var(--${token}) so it follows the theme`);
  }
});

test("both text tokens clear WCAG AA on every surface they sit on", async () => {
  const css = await readFile(CSS, "utf8");
  const light = tokens(css, ":root");
  const dark = tokens(css, ':root[data-theme="dark"]');

  // ink and muted, in each theme, on the card/surface they render on
  const cases = [
    ["light ink on card", light.ink, "#ffffff"],
    ["light muted on card", light.muted, "#ffffff"],
    ["light muted on optional-intro", light.muted, "#f0f5fa"],
    ["dark ink on surface", dark.ink, dark.surface],
    ["dark muted on surface", dark.muted, dark.surface],
    ["dark muted on page", dark.muted, dark.page],
  ];
  for (const [name, fg, bg] of cases) {
    assert.ok(contrast(fg, bg) >= 4.5, `${name} = ${contrast(fg, bg).toFixed(2)}:1, below WCAG AA 4.5:1`);
  }
});
