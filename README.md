# Drift — Sleep Sounds & White Noise

A white-noise and ambient-sound mixer for iOS and Android (plus web), built with Expo SDK 57 / React Native 0.86.

<p>
  <img src="store/screenshots/ios-6.9in/01-sounds.jpg" width="160" />
  <img src="store/screenshots/ios-6.9in/02-mixer.jpg" width="160" />
  <img src="store/screenshots/ios-6.9in/03-mixes.jpg" width="160" />
  <img src="store/screenshots/ios-6.9in/05-timer-running.jpg" width="160" />
  <img src="store/screenshots/ios-6.9in/07-bedside.jpg" width="160" />
</p>

## Features

- **35 seamless sounds** in 7 categories: noise colours, rain, water, nature, air, home and tones (binaural beats, Om, singing bowls)
- **Mixer**: layer up to 8 sounds, each with its own volume, plus a master volume
- **Search & filter** by name, mood or tag ("baby", "focus", "storm"), by category, or favourites
- **Saved mixes**: save, rename, update, delete — plus 12 curated mixes in Sleep / Focus / Relax / Baby collections
- **Sleep timer** from 5 min to 12 h with a **gradual fade-out** (off, 1–30 min, or across the entire timer); extend while running
- **Gentle fade-in** when playback starts
- **Living sounds**: thunder claps and bird calls are triggered at random with varied pitch, pan and level, so they never repeat the same way twice
- **Background playback** with lock-screen / notification controls
- **Pauses for calls** and resumes after, pauses when headphones disconnect (optional), optional "play with other apps"
- **Bedside clock**: dim night screen that keeps the display on and drifts to avoid burn-in
- **"Surprise me"** random mix, haptics, accessibility labels, phone and tablet layouts
- **Private & offline**: no accounts, ads, analytics or network calls

## How the audio works

Every sound is **synthesized from code** (`synth/`), so there are no licensing questions and the audio is reproducible:

1. `npm run synth` renders each recipe at 48 kHz with a small DSP toolkit (`synth/dsp.ts`: biquads, coloured noise, envelopes, reverb, seamless crossfaded loops), normalises loudness, and encodes MP3 into `assets/sounds/`, along with a typed manifest (`src/audio/generated/manifest.ts`).
2. Each loop is written with **circular padding** (the loop's tail before it, its head after it). The engine plays the region between `loopStart`/`loopEnd` with a sample-accurate `AudioBufferSourceNode`, so loops are gapless even though MP3 adds encoder padding.
3. The engine (`src/audio/engine.ts`) runs on [`react-native-audio-api`](https://docs.swmansion.com/react-native-audio-api/) (the Web Audio API on native; the browser's own Web Audio on web). The graph is: per-sound gain → master → play/pause fade → sleep-timer fade → soft limiter → output. Fades are scheduled on the audio thread, so they stay smooth with the screen off.

`npm run synth -- --wav <dir>` also keeps uncompressed WAVs for listening.

## Project layout

```
src/app/            Expo Router screens (tabs: Sounds, Mixes, Timer, Settings; modals: mixer, save-mix, sound/[id], nightstand)
src/audio/          catalog, engine, math (fade curves), OS integration hook
src/state/          zustand store (persisted with AsyncStorage) and curated presets
src/components/     UI kit, sound tile, mini player, tab bar, progress ring…
synth/              build-time sound synthesis (Node + ffmpeg)
assets/             app icons, splash, generated sounds, brand SVG
store/              store listing copy, privacy policy, generated screenshots
scripts/            brand/icon renderer and store screenshot capture (Playwright)
__tests__/          Jest tests (DSP, fade math, catalog, store)
```

## Development

```bash
npm install
npm run typecheck && npm run lint && npm test
npx expo start --web          # quickest way to try the UI and audio
```

`react-native-audio-api` has native code, so on devices use a **development build** (not Expo Go):

```bash
npx eas-cli@latest build --profile development --platform ios      # or android
npx expo start --dev-client
```

## Releasing to the App Store and Google Play

Builds are made in the cloud with EAS — no Mac required.

1. **One-time setup**
   - `npx eas-cli@latest login` then `npx eas-cli@latest init` (writes the EAS project ID into `app.json`).
   - Check that the name *Drift* and the IDs `com.nivijah.drift` are available; change `name`, `slug`, `ios.bundleIdentifier` and `android.package` in `app.json` if not.
   - Apple: an Apple Developer Program membership; create the app in App Store Connect. EAS creates certificates and profiles for you.
   - Google: a Play Console account; create the app. For automated submission, create a service-account JSON key and save it as `secrets/google-play-service-account.json` (git-ignored). The very first Android upload must be done manually in the Play Console.
   - Host `store/privacy-policy.html` publicly (GitHub Pages works) — both stores require the URL.
2. **Build**: `npx eas-cli@latest build --profile production --platform all` (version numbers are managed remotely and auto-incremented).
3. **Submit**: `npx eas-cli@latest submit --platform ios` and `--platform android` (Android goes to the *internal* track as a draft; promote it in the console).
4. **Listing**: copy text, keywords, privacy answers and review notes from [`store/listing.md`](store/listing.md); upload screenshots from `store/screenshots/` and the feature graphic from `assets/store/`.

Bump `version` in `app.json` for each store release.

### Regenerating assets

```bash
npm run synth                       # sounds (needs ffmpeg)
node scripts/render-brand.mjs       # icons, splash, favicon, feature graphic (needs playwright)
npx expo export --platform web && (cd dist && python3 -m http.server 8765) &
node scripts/store-screenshots.mjs  # store screenshots
```

## Things to verify on real devices before release

The JS bundles for iOS and Android compile, the native config is validated by `expo prebuild` / `expo-doctor`, and the full audio path is exercised in a browser. What can only be checked on hardware:

- background playback with the screen locked for a full sleep timer (iOS and Android)
- lock-screen / notification play-pause controls
- call interruption + resume, headphone unplug
- the Android 13+ notification permission prompt on first play
