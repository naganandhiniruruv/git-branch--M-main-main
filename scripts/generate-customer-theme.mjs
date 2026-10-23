// Generates app/theme-customer.css: a crimson re-skin that applies ONLY while a
// customer is signed in (html.theme-customer). The vendor, operations and admin
// portals — and the logged-out landing page — keep the original green brand,
// because none of the source files are edited: this script reads the existing
// stylesheet and the Tailwind colour tokens used in the components, and emits
// scoped overrides for every brand green / CTA red it finds.
//
// Re-run after changing app/globals.css or adding brand-coloured utility classes:
//   node scripts/generate-customer-theme.mjs
import fs from "node:fs";
import postcss from "postcss";

const SCOPE = "html.theme-customer";
const COMPONENT_FILES = ["components/sheplates-v3.tsx"];
const HUE = 343;

const hexToRgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2; let h = 0, s = 0;
  if (max !== min) {
    const d = max - min; s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60;
  }
  return [h, s, l];
}
function hslToRgb([h, s, l]) {
  h /= 360;
  const f = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; };
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  return [f(p, q, h + 1 / 3), f(p, q, h), f(p, q, h - 1 / 3)].map((v) => Math.round(v * 255));
}
const toHex = ([r, g, b]) => `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;

/** Crimson equivalent of a brand green / CTA red, or null for any other colour. */
function remap([r, g, b]) {
  const [h, s, l] = rgbToHsl([r, g, b]);
  const isGreen = h >= 70 && h <= 175 && s >= 0.16 && l > 0.05 && l < 0.97;
  const isRed = (h <= 8 || h >= 352) && s >= 0.55 && l > 0.3 && l < 0.7;
  if (!isGreen && !isRed) return null;
  const sat = l > 0.88 ? Math.min(1, s * 0.9 + 0.35) : l < 0.2 ? 0.62 : Math.max(0.68, Math.min(0.8, s + 0.1));
  // The old greens were dark (L~0.3); lift the mid range so primary buttons read as the vivid crimson.
  const light = isGreen && l >= 0.2 && l <= 0.6 ? Math.min(0.62, 0.3 + (l - 0.2) * 1.5) : l;
  return hslToRgb([HUE, sat, light]);
}
const remapHex = (hex) => { const out = remap(hexToRgb(hex)); return out ? toHex(out) : null; };

function remapValue(value) {
  let changed = false;
  let next = value.replace(/#([0-9a-fA-F]{6})\b/g, (m) => { const out = remapHex(m); if (!out) return m; changed = true; return out; });
  next = next.replace(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(\s*,\s*[\d.]+)?\s*\)/g, (m, r, g, b, a) => {
    const out = remap([+r, +g, +b]); if (!out) return m; changed = true;
    return a !== undefined ? `rgba(${out[0]},${out[1]},${out[2]}${a})` : `rgb(${out[0]},${out[1]},${out[2]})`;
  });
  return changed ? next : null;
}

const blocks = new Map(); // at-rule wrapper ("" for top level) -> css rules
function emit(wrapper, css) { blocks.set(wrapper, (blocks.get(wrapper) || "") + css + "\n"); }

// 1. Stylesheet rules that use brand colours.
const root = postcss.parse(fs.readFileSync("app/globals.css", "utf8"));
root.walkRules((rule) => {
  let skip = false; const wrappers = [];
  for (let p = rule.parent; p && p.type !== "root"; p = p.parent) {
    if (p.type !== "atrule") continue;
    if (["keyframes", "theme", "utility", "property", "font-face", "layer"].includes(p.name)) { if (p.name !== "layer") skip = true; }
    if (["media", "supports", "container"].includes(p.name)) wrappers.unshift(`@${p.name} ${p.params}`);
  }
  if (skip) return;
  const decls = [];
  rule.each((node) => { if (node.type !== "decl") return; const next = remapValue(node.value); if (next !== null) decls.push(`${node.prop}:${next}${node.important ? " !important" : ""}`); });
  if (!decls.length) return;
  const selectors = rule.selectors.map((s) => (s.startsWith(":root") ? s.replace(":root", SCOPE) : s === "html" ? SCOPE : s === "body" ? `${SCOPE} body` : `${SCOPE} ${s}`));
  emit(wrappers.join(" {\n"), `${selectors.join(",")}{${decls.join(";")}}`);
});

// 2. Tailwind arbitrary-colour utilities in components (bg-[#5ba400], hover:text-[#477f00]/80 …).
const PROPS = { bg: ["background-color"], text: ["color"], border: ["border-color"], ring: ["--tw-ring-color"], from: ["--tw-gradient-from"], via: ["--tw-gradient-via"], to: ["--tw-gradient-to"], fill: ["fill"], stroke: ["stroke"], outline: ["outline-color"], shadow: ["--tw-shadow-color"] };
const BREAKPOINTS = { sm: "640px", md: "768px", lg: "1024px", xl: "1280px" };
const PSEUDO = { hover: ":hover", focus: ":focus", "focus-visible": ":focus-visible", active: ":active", disabled: ":disabled" };
const tokens = new Set();
for (const file of COMPONENT_FILES) {
  const text = fs.readFileSync(file, "utf8");
  for (const m of text.matchAll(/(?:[a-z-]+:)*(?:bg|text|border|ring|from|via|to|fill|stroke|outline|shadow)-\[#[0-9a-fA-F]{6}\](?:\/\d{1,3})?/g)) tokens.add(m[0]);
}
for (const token of tokens) {
  const parts = token.split(":"); const utility = parts.pop(); const variants = parts;
  const m = utility.match(/^([a-z]+)-\[(#[0-9a-fA-F]{6})\](?:\/(\d{1,3}))?$/); if (!m) continue;
  const [, prop, hex, opacity] = m; const next = remapHex(hex); if (!next || !PROPS[prop]) continue;
  let pseudo = ""; let media = ""; let ok = true;
  for (const v of variants) { if (PSEUDO[v]) pseudo += PSEUDO[v]; else if (BREAKPOINTS[v]) media = `@media (min-width: ${BREAKPOINTS[v]})`; else ok = false; }
  if (!ok) continue;
  const [r, g, b] = hexToRgb(next);
  const color = opacity ? `rgba(${r},${g},${b},${(+opacity / 100).toFixed(2)})` : next;
  const escaped = token.replace(/"/g, '\\"');
  emit(media, `${SCOPE} [class~="${escaped}"]${pseudo}{${PROPS[prop].map((p) => `${p}:${color}`).join(";")}}`);
}

let out = "/* GENERATED by scripts/generate-customer-theme.mjs — do not edit by hand. Applies only under html.theme-customer. */\n";
for (const [wrapper, css] of blocks) out += wrapper ? `${wrapper} {\n${css}}\n` : css;
fs.writeFileSync("app/theme-customer.css", out);
console.log(`theme-customer.css: ${out.length} bytes, ${tokens.size} component tokens scanned`);
