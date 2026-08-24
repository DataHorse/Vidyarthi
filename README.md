# Vidyarthi — విద్యార్థి ✍️

A friendly, kid-first web app for practicing how to **write Telugu letters** —
on iPad, iPhone, Android phones/tablets, or any touch-screen laptop.

Kids move through the alphabet in the traditional teaching order (vowels,
then consonants), listen to how each letter sounds, see a simple picture
word for it, and **trace a dotted outline** of the letter with a finger,
stylus, or mouse before drawing it freehand — all set in a sky full of
drifting kites and clouds, a rainbow over a flower meadow, and a cheering
unicorn mascot. At night (system dark mode) the very same sky turns into a
star-studded night with a soft moonbow — no toggle needed, it just follows
the device's theme.

See [`PROMPT.md`](PROMPT.md) for the full design/engineering brief this app
was built from.

## ✨ Features

- **51 letters in the traditional sequence**: అ ఆ ఇ ఈ ... then క ఖ గ ఘ ... in
  their classic groupings, each tappable from a home grid, color-coded by
  section so kids can tell the groups apart at a glance.
- **A living sky-and-meadow scene**: drifting clouds, gently swaying kites,
  a rainbow arch, a meadow of flowers, and a bobbing unicorn mascot —
  built as lightweight inline SVG/CSS, no image assets to load. Switches
  to a twinkling starry night automatically with the device's dark mode.
- **Trace-and-draw practice screen**: a dashed guide of the letter sits
  behind a transparent drawing canvas — framed in a rainbow-gradient
  border — the child draws right on top of it with a big, colorful,
  crayon-style stroke.
- **Listen 🔊**: taps a "Listen" button to hear the letter, and another to
  hear a simple example word (e.g. అ → అమ్మ "Amma" — Mother), using the
  device's built-in text-to-speech (no audio files to download).
- **Positive feedback only**: an "I'm done!" button always celebrates with
  a cheering unicorn + confetti — there's no "wrong" way to trace.
- **Custom hand-drawn icons throughout**: home, speaker, eraser, checkmark,
  and navigation arrows are all crisp inline SVG (not raw system emoji),
  sized for small hands per common kids'-app touch-target guidance.
- **Progress that sticks**: practiced letters get a star, saved in the
  browser (`localStorage`) so it's there next time.
- **Installable**: has a web app manifest + service worker, so kids (or
  parents) can "Add to Home Screen" on iOS/Android and it opens full-screen
  like a native app, even offline.
- **Zero build step, zero dependencies**: plain HTML/CSS/JS. No npm install,
  no framework, nothing to compile — just static files.

## 📸 Preview

| Home screen (day) | Practice & trace | Celebration |
|---|---|---|
| ![Home screen](assets/screenshots/home-screen.png) | ![Practice screen](assets/screenshots/practice-screen.png) | ![Celebration](assets/screenshots/celebration.png) |

| Home screen (night — automatic in dark mode) |
|---|
| ![Night sky theme](assets/screenshots/night-sky-theme.png) |

## 🚀 Deploy it on GitHub Pages (free hosting, works on any device)

1. Create a new GitHub repository (e.g. `vidyarthi`) and push this
   folder's contents to its `main` branch:

   ```bash
   cd vidyarthi
   git init
   git add .
   git commit -m "Vidyarthi v1"
   git branch -M main
   git remote add origin https://github.com/<your-username>/vidyarthi.git
   git push -u origin main
   ```

2. On GitHub, go to **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **Deploy from a branch**.
4. Pick branch **main**, folder **/ (root)**, then **Save**.
5. GitHub gives you a URL like:

   `https://<your-username>.github.io/vidyarthi/`

   Open that URL on any iPad, iPhone, Android device, or touch laptop.

### Installing it like an app

- **iPhone/iPad (Safari)**: open the URL → tap the Share icon → **Add to
  Home Screen**.
- **Android (Chrome)**: open the URL → tap the ⋮ menu → **Add to Home
  screen** / **Install app**.
- **Touch laptop (Chrome/Edge)**: open the URL → click the install icon (⊕)
  in the address bar.

Once installed, the service worker caches the app shell so it keeps
working without an internet connection (text-to-speech itself may still
need a connection on some devices/OSes).

## 🧪 Testing

Two Playwright suites drive the app in a real headless browser:

- `tests/test_app.py` — functional smoke test at iPhone/iPad sizes: all 51
  letters render, drawing on the canvas registers ink, Clear/Done/
  navigation work, and progress + stars persist to `localStorage`.
- `tests/test_redesign.py` — visual/theme pass across light (day sky) and
  dark (night sky) `prefers-color-scheme`, iPhone and iPad viewports, and
  a `prefers-reduced-motion` check.

```bash
pip install playwright
playwright install chromium
python3 -m http.server 8000 &      # serve the app from the repo root
python3 tests/test_app.py
python3 tests/test_redesign.py
```

## 🗂 Project structure

```
index.html          Single-page app shell (home screen + practice screen)
css/style.css        All styling — bright, rounded, kid-friendly, responsive
js/letters.js         Ordered Telugu letter data (glyph, sound, example word)
js/app.js              App logic: navigation, canvas drawing, speech, progress
manifest.json         PWA manifest ("Add to Home Screen")
sw.js                  Service worker for offline app-shell caching
assets/icons/           App icons (generated by scripts/make_icons.py)
assets/screenshots/     Preview images used in this README
scripts/make_icons.py  Regenerates the app icons
tests/test_app.py      Playwright functional smoke test
tests/test_redesign.py Playwright visual/theme test (light + dark, iPhone + iPad)
PROMPT.md              The design/engineering brief this app was built from
```

## 🔮 Ideas for v2

- Swap the Web Speech API for real recorded native-speaker audio per letter
  (drop `.mp3` files in and point `js/letters.js` at them — the UI already
  has dedicated "listen" buttons ready for this).
- Score how closely a trace follows the guide (simple point-distance check
  against the dashed path).
- Add vowel-sign (గుణింతం) practice — a consonant combined with each vowel
  sign — as a "level 2" once the base alphabet is comfortable.
- Multiple kid profiles / avatars sharing one device.

## License

MIT — free to use, adapt, and share for learning.
