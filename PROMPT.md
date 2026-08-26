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
   (అచ్చులు) first — అ, ఆ, ఇ, ఈ, ఉ, ఊ, ఋ, ౠ, ఎ, ఏ, ఐ, ఒ, ఓ, ఔ, అం, అః — then
   consonants (హల్లులు) in traditional varga order — క ఖ గ ఘ ఙ · చ ఛ జ ఝ ఞ ·
   ట ఠ డ ఢ ణ · త థ ద ధ న · ప ఫ బ భ మ · య ర ల వ · శ ష స హ · ళ క్ష ఱ (52
   letters total). The long vocalic ౠ is taught alongside its short pair ఋ
   since it's still part of the modern curriculum; the archaic ఌ/ౡ and the
   obsolete ఴ remain omitted. Letters that are traditionally taught as a
   short/long (or triple) pair, or grouped together as a related set of
   "other letters" — అ+ఆ, ఇ+ఈ, ఉ+ఊ, ఋ+ౠ, ఎ+ఏ+ఐ, ఒ+ఓ+ఔ, అం+అః, (య,ర,ల,వ),
   (శ,ష,స,హ), (ళ,క్ష,ఱ) — carry a shared `cluster` id in the data so the UI
   can keep them visually grouped wherever letters are listed.
2. Group letters into **Lessons**, and lessons into **Chapters**. Chapter 1
   is the alphabet: small, focused sets (3–5 letters) so a child can spend
   real, repeated practice time on just a handful of letters — e.g. Lesson 1
   is అ, ఆ, ఇ, ఈ — instead of facing all 52 at once; lesson boundaries never
   split a cluster (12 lessons). Chapter 2 is గుణింతం — each of the 36
   consonants combined with each of the 15 dependent vowel signs (ా ి ీ ు ూ
   ృ ౄ ె ే ై ొ ో ౌ ం ః) — with one lesson per consonant covering its full
   15-combination row (కా కి కీ కు కూ కృ కౄ కె కే కై కొ కో కౌ కం కః, and so
   on for every consonant), the way a Telugu classroom drills a గుణింతం row
   as one chanted set rather than in small groups; 36 lessons, continuing the
   numbering after Chapter 1. Both chapters share one lesson-numbering
   sequence and one home screen, split into two clearly labeled, independently
   **collapsible** sections (chapter title, one-line description, its own
   "N / lessons" progress, and a chevron) — with 48 lessons total on one
   screen, an always-fully-expanded list would be overwhelming, so the
   chapter a child is *currently working through* (the first, in chapter
   order, that isn't 100% complete) opens by default and the rest start
   collapsed; tapping a header always toggles that one chapter regardless of
   the computed default, and that explicit choice is remembered
   (`localStorage`) from then on. The home screen is a list of lesson cards
   (title, subtitle, a preview of its letters, and its own progress), and
   tapping one opens the practice screen scoped to just that lesson's letters
   (Previous/Next navigate only within the lesson). Completing every letter
   in a lesson triggers a bigger "Lesson complete!" celebration and marks the
   lesson card with a check. Chapter 2's combinations are generated
   programmatically from the 36 consonants and 15 vowel signs — writing a
   dependent vowel sign right after a consonant character is exactly how
   Unicode Telugu composes the combined akshara — rather than hand-authored;
   unlike Chapter 1, most don't carry a per-letter example word (verifying an
   accurate, real, kid-appropriate word for all 540 combinations individually
   is out of scope), but 162 of the 540 *do* have one where research turned
   up a genuinely common, real, child-appropriate word — sparse coverage by
   design, favoring "no word" over a forced/obscure/invented one. A combo
   without word data shows its glyph, transliteration, and "Listen"
   pronunciation only, with no word row.
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
   - Has big **Clear**, **◀ Previous / Next ▶** controls, and a
     **"Check it! ✅"** button that **checks the trace** (see below) and
     either celebrates (confetti + star, marks the letter practiced, then
     moves into Practice mode on the *same* letter — see goal 5) or asks the
     child to try again — never both unconditionally. The button is named
     "Check it!" (not the earlier "I'm done!") to read as an invitation to
     see how the drawing did rather than a bare completion click; Practice
     mode's version of the same button reads "See my score!" instead, since
     it reports a percentage rather than pass/retry.
   - Offers a way back to the *current lesson* from anywhere on this screen,
     not only all the way to Home: tapping either the progress pill
     (`3 / 15`) or the lesson-name pill opens a letter picker scoped to the
     lesson in progress — every one of its letters as a tappable tile
     (marked for "current" and "already practiced"), so a child can hop to a
     different character in the same lesson without losing their place in
     it. The Home button still exists for going all the way back to the
     full lesson list.
4. **Check trace accuracy, honestly — and score legibility, not print-
   exactness.** Sample the child's drawing against the letter's actual shape
   (masks built from the same glyph/layout, so everything stays aligned) and
   score three things: *coverage*, *precision*, and *shape*. Precision is
   measured against a *dilated* mask (the glyph's bold fill plus a tolerance
   halo) — how much of the child's ink landed reasonably close to the
   letter. Coverage is measured against a *core* mask: the very same glyph,
   at the very same size and position, rendered at a much **thinner font
   weight** than the bold guide glyph — not the bold shape itself. A real
   pen stroke, even a careful and accurate one, can never fill a boldly-
   printed guide glyph's full thick interior, so grading coverage against
   that full bold shape quietly capped even a genuinely good trace's score
   well below what it visually deserved (a drawing that looked like a clean,
   close match could score barely over half). Grading against a thinner-
   stroked rendering of the same letter instead asks "did the ink pass
   through the letter's real stroke path" rather than "did the ink fill this
   bold glyph edge-to-edge" — which a real pen stroke can actually achieve.
   Before comparing, re-fit the child's own ink bounding box onto the
   glyph's own ink bounding box (computed from the bold fill), independently
   per axis and scale-up only — a touchscreen drawing is essentially never
   the printed glyph's exact size, position, or proportions (especially with
   no guide underneath, in Practice mode), and grading should track "is this
   legibly the right letter" rather than "does this match the print
   exactly". A stray dot/tap is too thin on both axes to qualify (that
   threshold scales down for glyphs that are themselves naturally short or
   narrow, like ౠ's vowel sign, so a fairly-proportioned small copy of a
   wide/short letter isn't unfairly refused a stretch), and how far anything
   can be stretched is capped, so a scribble spanning most of the box never
   gets shrunk down to fake a tight match.

   Coverage and precision alone are still only an *area-overlap* test —
   "did ink land on the shape" — which a scribble that densely fills most of
   the drawing box can satisfy by accident, without being shaped anything
   like the letter. *Shape* is a genuine pattern-recognition check that
   closes that gap: divide the drawing into an 8x8 grid of zones, build an
   ink-density signature per zone for both the child's drawing and the
   letter's own core stroke path, and measure how well the two *patterns*
   correlate (the classical OCR "zoning" technique) — dense where the
   letter has strokes, sparse in its gaps and counters, the same way a
   person visually compares two drawings rather than just checking whether
   ink is "on" the letter. A scribble that fills the box roughly evenly
   produces a close-to-flat signature with little to correlate against
   anything; a real trace's signature — even an imprecise one — resembles
   the letter's own, because it approximately *is* the letter's own
   pattern. Coverage and precision must each clear a threshold to pass,
   shape must independently clear its own threshold, *and* the overall
   match percentage (their blended product) must also clear its own
   threshold — the coverage/precision thresholds alone let a scribble that
   spans most of the drawing box rack up moderate-moderate on both at once
   purely by covering a lot of ground; the shape check closes the deeper gap
   of "covered a lot of ground without looking anything like the letter",
   while a pixel-accurate trace can still score close to 100%. A blank
   canvas or an off-target scribble gets an encouraging "try again" message
   instead of false praise, and is never marked practiced or auto-advanced.
5. Offer a **Practice mode**: a toggle next to Trace mode that swaps the
   dashed-outline guide for a completely blank box — no outline at all — so
   a child can test whether they've actually memorized a letter's shape,
   the way a workbook moves from tracing to copying-from-memory. A passing
   trace switches straight into Practice mode on the same letter instead of
   advancing to the next one, so a child tries the letter from memory right
   after tracing it well, while moving to a different letter (Prev/Next)
   always lands back in Trace mode, since that letter hasn't been traced
   yet. "See my score!" reuses the same coverage/precision scorer as Trace mode
   (with the same size/position/proportion leniency), but reports a single
   0-100% "match" score — their *product*, not an average, so a shape needs
   to be both genuinely complete and genuinely on-target to score well,
   which resists a spread-out scribble racking up moderate coverage and
   moderate precision at once just by covering a lot of the box — instead of
   a binary pass/retry, keeps a per-letter personal-best score in its own
   `localStorage` record, and never auto-advances — the point is repeated
   attempts at the same letter. It's entirely separate from Trace mode's
   star/progress tracking, so free practice never affects lesson
   completion; opening a lesson fresh always starts in Trace mode.
6. Track practiced letters and a simple star count in `localStorage` so
   progress persists between visits on the same device.
7. Be installable to the home screen (PWA manifest + service worker) so it
   opens full-screen like a native app on iPad/iPhone/Android.

## Non-goals for v1

- No *stroke-order or stroke-direction* recognition — the trace-accuracy
  check (goal 4 above) grades the finished ink's coverage, precision, and
  zone-density shape pattern against the letter, all independent of the
  order or direction strokes were drawn in, and is intentionally lenient
  about wobble, size, and position while still requiring the ink to
  actually be patterned like the letter (not just present near it).
- No user accounts, no backend, no analytics, no ads.
- No recorded native-speaker audio files. v1 uses the on-device
  `SpeechSynthesis` Web Speech API, explicitly selecting the best available
  Telugu voice (`te`/`te-IN`) from `speechSynthesis.getVoices()` rather than
  leaving it to the browser's default guess, with a graceful fallback
  message on devices without any Telugu voice. Pronunciation quality is
  still ultimately bounded by whatever Telugu voice (if any) the device
  ships — v2 can swap in recorded `.mp3` files per letter without changing
  the UI, which is the only way to fully control pronunciation quality.

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
