// Renders the SVG brand sources in assets/brand into the PNGs Expo needs.
// Usage: node scripts/render-brand.mjs   (requires `playwright` with Chromium available)
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Buffer } from 'node:buffer';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const glyph = readFileSync(join(root, 'assets/brand/glyph.svg'), 'utf8');
const glyphUri = `data:image/svg+xml;base64,${Buffer.from(glyph).toString('base64')}`;
const bg = `radial-gradient(circle at 30% 25%, #2A3470 0%, #121A40 45%, #070B18 100%)`;

const targets = [
  // full-bleed iOS / store icon (no transparency allowed)
  { file: 'icon.png', size: 1024, background: bg, scale: 0.92 },
  // Android adaptive icon layers; the foreground keeps the glyph inside the 66% safe zone
  { file: 'android-icon-foreground.png', size: 1024, background: 'transparent', scale: 0.62 },
  { file: 'android-icon-background.png', size: 1024, background: bg, scale: 0 },
  { file: 'android-icon-monochrome.png', size: 1024, background: 'transparent', scale: 0.62, mono: true },
  { file: 'splash-icon.png', size: 1024, background: 'transparent', scale: 0.9 },
  { file: 'favicon.png', size: 96, background: bg, scale: 0.95 },
  // Play Store feature graphic
  { file: 'store/feature-graphic.png', width: 1024, height: 500, background: bg, scale: 0.8, banner: true },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const t of targets) {
  const w = t.width ?? t.size;
  const h = t.height ?? t.size;
  await page.setViewportSize({ width: w, height: h });
  const img = t.scale
    ? `<img src="${glyphUri}" style="width:${Math.min(w, h) * t.scale}px;height:${Math.min(w, h) * t.scale}px;${
        t.mono ? 'filter:brightness(0) invert(1);' : ''
      }"/>`
    : '';
  const banner = t.banner
    ? `<div style="font:700 92px -apple-system,Segoe UI,Roboto,sans-serif;color:#EEF1FA;letter-spacing:-2px">Drift<div style="font:500 30px -apple-system,Segoe UI,Roboto,sans-serif;color:#A3ACC7;letter-spacing:0;margin-top:8px">Sleep sounds &amp; white noise</div></div>`
    : '';
  await page.setContent(
    `<html><body style="margin:0;width:${w}px;height:${h}px;background:${t.background};display:flex;align-items:center;justify-content:center;gap:40px">${img}${banner}</body></html>`,
  );
  await page.waitForTimeout(50);
  const buf = await page.screenshot({ omitBackground: t.background === 'transparent' });
  writeFileSync(join(root, 'assets', t.file), buf);
  console.log('wrote', t.file);
}
await browser.close();
