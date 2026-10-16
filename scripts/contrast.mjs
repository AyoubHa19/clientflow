// Measures WCAG contrast between the colour tokens in src/app/globals.css.
// Run: node scripts/contrast.mjs
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

function tokens(selector) {
  const block = css.match(new RegExp(`${selector} \\{([\\s\\S]*?)\\n\\}`))?.[1] ?? "";
  const out = {};
  for (const [, name, l, c, h] of block.matchAll(
    /--([\w-]+): oklch\(([\d.]+) ([\d.]+) ([\d.]+)\);/g,
  )) {
    out[name] = [Number(l), Number(c), Number(h)];
  }
  return out;
}

// OKLCH → linear sRGB (Björn Ottosson's OKLab matrices).
function toLinearRgb([L, C, H]) {
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((v) => Math.min(1, Math.max(0, v)));
}

const luminance = (color) => {
  const [r, g, b] = toLinearRgb(color);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const pairs = [
  ["foreground", "card"],
  ["foreground", "background"],
  ["muted-foreground", "card"],
  ["muted-foreground", "background"],
  ["muted-foreground", "muted"],
  ["brand", "card"],
  ["brand", "background"],
  ["brand-foreground", "brand"],
  ["brand", "brand-soft"],
  ["primary-foreground", "primary"],
  ["destructive", "card"],
  ["success", "card"],
  ["warning", "card"],
  ["input", "card"],
];

let failed = false;
for (const [label, selector] of [
  ["light", ":root"],
  ["dark", "\\.dark"],
]) {
  const t = tokens(selector);
  console.log(`\n${label}`);
  for (const [fg, bg] of pairs) {
    if (!t[fg] || !t[bg]) continue;
    const ratio = contrast(t[fg], t[bg]);
    // Text needs 4.5:1; the input border is a control boundary (3:1).
    const min = fg === "input" ? 3 : 4.5;
    const ok = ratio >= min;
    if (!ok) failed = true;
    console.log(`  ${ok ? "ok  " : "FAIL"} ${fg} on ${bg}: ${ratio.toFixed(2)}:1 (min ${min})`);
  }
}
process.exitCode = failed ? 1 : 0;
