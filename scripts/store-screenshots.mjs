// Captures App Store / Play Store screenshots from the web build.
// Usage: npx expo export --platform web && (cd dist && python3 -m http.server 8765) &
//        node scripts/store-screenshots.mjs [baseUrl]
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const base = process.argv[2] ?? 'http://localhost:8765/';

const devices = [
  { name: 'ios-6.9in', width: 440, height: 956, scale: 3 }, // 1320 x 2868
  { name: 'ipad-13in', width: 1032, height: 1376, scale: 2 }, // 2064 x 2752
  { name: 'android-phone', width: 360, height: 800, scale: 3 }, // 1080 x 2400
];

const seed = {
  state: {
    mix: { 'light-rain': 0.6, campfire: 0.45, thunder: 0.35 },
    masterVolume: 0.8,
    favorites: ['brown', 'ocean', 'light-rain'],
    presets: [
      { id: 'p1', name: 'Bedtime', mix: { 'light-rain': 0.6, campfire: 0.45, thunder: 0.35 }, createdAt: 1 },
      { id: 'p2', name: 'Deep Work', mix: { brown: 0.6, 'binaural-beta': 0.25 }, createdAt: 2 },
      { id: 'p3', name: 'Beach Nap', mix: { ocean: 0.65, wind: 0.2, crickets: 0.25 }, createdAt: 3 },
      { id: 'p4', name: 'Baby Sleep', mix: { shush: 0.5, heartbeat: 0.5, white: 0.3 }, createdAt: 4 },
    ],
    activePresetId: 'p1',
    timerPrefs: { minutes: 45, fadeMinutes: 15 },
    settings: { fadeInSeconds: 3, haptics: true, mixWithOthers: false, keepAwake: false, pauseOnDisconnect: true },
  },
  version: 1,
};

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
for (const d of devices) {
  const dir = join(root, 'store', 'screenshots', d.name);
  mkdirSync(dir, { recursive: true });
  const ctx = await browser.newContext({
    viewport: { width: d.width, height: d.height },
    deviceScaleFactor: d.scale,
    isMobile: d.width < 800,
    hasTouch: true,
  });
  await ctx.addInitScript((s) => localStorage.setItem('drift-store', JSON.stringify(s)), seed);
  const page = await ctx.newPage();
  const shot = (n) => page.screenshot({ path: join(dir, `${n}.jpg`), type: 'jpeg', quality: 88 });
  await page.goto(base);
  await page.waitForTimeout(2000);
  // start playback so tiles glow and the mini player shows "Pause"
  await page.getByRole('button', { name: 'Play', exact: true }).first().click();
  await page.waitForTimeout(2500);
  await shot('01-sounds');
  await page.getByLabel(/Now playing/).click();
  await page.waitForTimeout(1200);
  await shot('02-mixer');
  await page.getByLabel('Close').first().click();
  await page.waitForTimeout(600);
  await page.getByRole('tab', { name: 'Mixes' }).click();
  await page.waitForTimeout(800);
  await shot('03-mixes');
  await page.getByRole('tab', { name: 'Timer' }).click();
  await page.waitForTimeout(600);
  await shot('04-timer');
  await page.getByRole('button', { name: /Start .*timer/ }).click();
  await page.waitForTimeout(1200);
  await shot('05-timer-running');
  await page.getByRole('tab', { name: 'Sounds' }).click();
  await page.waitForTimeout(400);
  await page.getByLabel('Search sounds').fill('baby');
  await page.waitForTimeout(600);
  await page.getByLabel('Search sounds').blur();
  await shot('06-search');
  await page.getByLabel('Open bedside clock').click();
  await page.waitForTimeout(1200);
  await shot('07-bedside');
  await ctx.close();
  console.log('captured', d.name);
}
await browser.close();
