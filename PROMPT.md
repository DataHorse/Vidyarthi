# Build Prompt — "Vidyarthi" Handwriting App for Kids

This is the design/engineering prompt used to build v1 of the app. It captures the
product requirements, pedagogy, and technical constraints so the build stays
consistent and so future contributors (human or AI) can extend it the same way.

## Persona

Act as three experts at once:
1. **Senior front-end app builder** — ships a fast, dependency-light, installable
   web app that works reliably across iPad, iPhone, Android phones/tablets, and
   touch-screen laptops, with no backend and no build step (deployable as static
   files on GitHub Pages).
2. **Telugu language teacher** — sequences the akshara (letters) the way they are
   traditionally taught, uses accurate Unicode Telugu text, correct
   transliteration, and simple, real, kid-known example words for each letter.
3. **Kids' language-learning app designer** — large touch targets (60–80px icons,
   48dp-minimum buttons, generous gaps, per common children's-app touch-target
   guidance), bright but not overwhelming colors, immediate positive feedback
   (visual + celebratory), minimal reading required to operate the app, forgiving
   interactions (nothing is a "wrong answer"), short attention-span-friendly flows,
   and a consistent, distinctive visual world (not a generic template) that a
   specific child will actually want to look at.

## Product goal

A "learn to write the Telugu alphabet" practice app for children, v1 scope:

1. Present Telugu letters **in traditional teaching sequence**: vowels
   (అచ్చులు) first — అ, ఆ, ఇ, ఈ, ఉ, ఊ, ఋ, ఎ, ఏ, ఐ, ఒ, ఓ, ఔ, అం, అః — then
   consonants (హల్లులు) in traditional varga order — క ఖ గ ఘ ఙ · చ ఛ జ ఝ ఞ ·
   ట ఠ డ ఢ ణ · త థ ద ధ న · ప ఫ బ భ మ · య ర ఱ ల ళ వ · శ ష స హ · క్ష.
   (Archaic Sanskrit-only vocalic vowels ఌ/ౡ/ౠ and the obsolete ఴ are
   intentionally omitted — they are not part of the modern children's
   curriculum.)
2. For each letter, show a **home grid** the child can tap to jump to any
   letter, with a star marking letters already practiced.
3. A **practice screen** per letter that:
   - Shows the letter large, in a proper Telugu font.
   - Has a **🔊 Listen** button that speaks the letter sound, and a
     **🔊 word** button that speaks a simple example word containing the
     letter (e.g., అ → అమ్మ / Amma / "Mother"), with the English meaning
     shown as a memory aid.
   - Shows a **dotted/dashed outline** of the letter as a trace guide.
   - Lets the child **draw directly on top of the guide** with finger,
     stylus (Apple Pencil, S Pen), or mouse, in a chunky, colorful,
     crayon-like stroke.
   - Has big **Clear**, **Try Again**, **◀ Previous / Next ▶** controls,
     and an **"I'm done! ✅"** button that triggers a small celebration
     (confetti + star) and marks the letter as practiced.
4. Track practiced letters and a simple star count in `localStorage` so
   progress persists between visits on the same device.
5. Be installable to the home screen (PWA manifest + service worker) so it
   opens full-screen like a native app on iPad/iPhone/Android.

## Non-goals for v1

- No handwriting-recognition/scoring of stroke accuracy (that's a v2 idea).
- No user accounts, no backend, no analytics, no ads.
- No recorded native-speaker audio files (v1 uses the on-device
  `SpeechSynthesis` Web Speech API with `te-IN` where available, with a
  graceful fallback message on devices without a Telugu voice — v2 can
  swap in recorded `.mp3` files per letter without changing the UI).

## Technical constraints

- **Zero build step.** Plain HTML/CSS/JS (ES modules), so it can be dropped
  straight into a GitHub repo and served by GitHub Pages with no CI.
- **Touch-first.** Use Pointer Events (`pointerdown/move/up/cancel`) so
  mouse, touch, and stylus all work identically; `touch-action: none` on
  the drawing canvas so the page doesn't scroll while drawing.
- **Responsive.** Single column on phones, larger canvas on tablets/desktop;
  works in both portrait and landscape.
- **Two-layer canvas per letter**: a background canvas renders the dashed
  trace-guide (via `ctx.setLineDash` + `strokeText`), a transparent
  foreground canvas captures the child's drawing, so "Clear" only wipes the
  drawing layer and the guide never has to be redrawn from scratch.
- **Accessible fonts.** `Noto Sans Telugu` (Google Fonts) for all Telugu text;
  `Fredoka` as the characterful display face (title, buttons, big labels) paired
  with the calmer `Quicksand` for body/meta text.
- **No frameworks required** — keep the dependency surface at zero so the
  app stays easy to audit, fork, and host for free.
- **Offline-friendly.** A small service worker caches the app shell so it
  still opens without a network connection after the first visit (Telugu
  text-to-speech itself may still need connectivity on some devices/OSes).

## Visual identity

A first real tester for this app is a child who loves rainbows, unicorns,
flowers, star-studded night skies, and blue skies with kites — so the app is
built as one continuous "Sky & Meadow" scene rather than a generic card UI:

- **Day (default)**: a blue-sky gradient with drifting clouds, gently swaying
  kites, a sun, a six-band rainbow arch, and a meadow of flowers along the
  bottom. A bobbing chibi unicorn mascot greets the child on the home screen
  and cheers (with confetti) on the celebration screen.
- **Night (automatic)**: the identical scene after sunset, driven purely by
  `prefers-color-scheme: dark` — no in-app toggle. The sky becomes a
  twinkling star field, the sun becomes a moon, and the rainbow becomes a
  soft, translucent moonbow. Card surfaces (letter tiles, the drawing canvas,
  word chips) deliberately stay light/cream in *both* themes so Telugu glyphs
  and drawing ink are always high-contrast — only the ambient scene changes.
- **Typography**: `Fredoka` (rounded, bubbly display face) for the app name,
  buttons, and big labels; `Quicksand` for calmer body/meta text; `Noto Sans
  Telugu` for all Telugu script. Two deliberately different personalities,
  not one rounded font doing every job.
- **Color coding as information, not decoration**: each teaching section
  (Vowels, Ka group, Cha group, ...) gets its own accent color for its tile
  borders, cycling through a curated palette — helping a pre-reader visually
  distinguish sections at a glance.
- **Custom icons over raw emoji**: home, speaker, eraser, checkmark, and
  prev/next are hand-drawn inline SVG (simple geometric shapes: circles,
  rounded paths, no elaborate illustration) so they render identically and
  crisply across iOS/Android/desktop, rather than relying on inconsistent
  system emoji glyphs for interactive controls. Decorative-only emoji/SVG
  (flowers, stars, the mascot) are used freely since they carry no required
  meaning.
- **Motion with restraint**: slow cloud drift, gentle kite sway, a soft
  twinkle on stars, a bob on the mascot — all pure CSS keyframes (no
  animation library), and all disabled under `prefers-reduced-motion: reduce`.
- **Grounded in research**: kids'-app UX guidance (large tappable icons,
  high-contrast large text, celebratory feedback with sound/confetti, simple
  3–5-choice navigation patterns, familiar mascot characters) informed the
  sizing and feedback choices — see the "Design plan" discussion in the
  project history for sourcing.

## Deliverable

A static site (`index.html`, `css/style.css`, `js/letters.js`, `js/app.js`,
`manifest.json`, `sw.js`, icons) ready to push to GitHub and enable via
GitHub Pages, plus a `README.md` with setup/deployment/testing notes.
