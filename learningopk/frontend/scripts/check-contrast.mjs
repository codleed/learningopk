// scripts/check-contrast.mjs — WCAG contrast gate for Kitab v3. Spec §6.4.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(root, "src/design-system/kitab-tokens.css"), "utf8");

function extractBlock(selectorRe) {
  const m = css.match(selectorRe);
  if (!m) throw new Error(`block not found: ${selectorRe}`);
  return m[0];
}
function parseVars(block) {
  const out = {};
  for (const [, k, v] of block.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    out[k.trim()] = v.trim();
  }
  return out;
}

const dark = parseVars(extractBlock(/:root\s*\{[^}]+\}/));
const light = parseVars(extractBlock(/:root\.light[\s\S]*?\.light\s*\{[^}]+\}/));

function hexToRgb(hex) {
  const h = hex.replace("#", "").trim();
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
function lum([r, g, b]) {
  const f = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function ratio(a, b) {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const PAIRS = [
  ["--ink", "--paper", 4.5],
  ["--ink-soft", "--paper", 4.5],
  ["--ink", "--paper-raised", 4.5],
  ["--ink-soft", "--paper-raised", 4.5],
  ["--on-accent", "--accent", 4.5],
  ["--danger", "--paper", 4.5],
  ["--warning", "--paper", 3.0],
  ["--graphite", "--paper", 4.5],
];

// accent is fill-only in light theme (spec §3.3); light text-on-paper uses accent-bright
const DARK_ONLY_PAIRS = [["--accent", "--paper", 3.0]];
const LIGHT_ONLY_PAIRS = [["--accent-bright", "--paper", 4.5]];

let failed = 0;
for (const [themeName, vars, extra] of [
  ["dark", dark, DARK_ONLY_PAIRS],
  ["light", light, LIGHT_ONLY_PAIRS],
]) {
  for (const [fg, bg, min] of [...PAIRS, ...extra]) {
    const a = hexToRgb(vars[fg] ?? "");
    const b = hexToRgb(vars[bg] ?? "");
    if (!a || !b) {
      console.error(`FAIL ${themeName}: cannot parse ${fg} (${vars[fg]}) / ${bg} (${vars[bg]})`);
      failed++;
      continue;
    }
    const r = ratio(a, b);
    const ok = r >= min;
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"} ${themeName} ${fg} on ${bg}: ${r.toFixed(2)}:1 (min ${min})`);
  }
}
if (failed) {
  console.error(`\n${failed} contrast failure(s)`);
  process.exit(1);
}
console.log("\nAll contrast pairs pass");
