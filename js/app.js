// app.js — Vidyarthi app logic (no dependencies, no build step).
(function () {
  "use strict";

  const STORAGE_KEY = "vidyarthi-progress-v1";
  const PRACTICE_KEY = "vidyarthi-practice-best-v1";
  const CHAPTER_UI_KEY = "vidyarthi-chapter-ui-v1";
  const PEN_COLORS = ["#FF5D8F", "#3DA9FF", "#21BFA6", "#FFC93C", "#8C6BFF", "#33314A"];

  // Trace-accuracy scoring thresholds. Drawing is sampled onto a small
  // (SCORE_SIZE x SCORE_SIZE) grid and compared against masks built from the
  // same glyph (see buildMasks). See scoreDrawing() below.
  const SCORE_SIZE = 96;
  const MIN_INK_PIXELS = 45; // below this, treat as "didn't really draw"
  const COVERAGE_MIN = 0.3; // fraction of the letter's *core* that got inked
  const PRECISION_MIN = 0.38; // fraction of the child's ink that landed on the letter
  // coverage and precision are independent tests ("inked *some* of the real
  // shape" and "stayed *mostly* on the real shape"), so a scribble spread
  // across most of the drawing box can clear both at once purely by
  // covering a lot of ground — moderate-moderate on each axis, without
  // actually being the right shape. PASS_MATCH_MIN adds the same guard
  // percentScore() below uses for Practice mode (their product, which needs
  // BOTH numbers genuinely good at once) to Trace mode's pass/retry gate too.
  const PASS_MATCH_MIN = 48;
  const DILATE_RATIO = 0.16; // forgiving halo around the glyph's true strokes,
  // as a fraction of SCORE_SIZE — generous enough for a kid's wobbly,
  // uneven-thickness line, without losing the letter's actual shape.

  // The printed guide glyph is drawn very bold (font-weight 900) so it reads
  // clearly on screen, but a real pen stroke — even a careful, accurate one —
  // is nowhere near that thick, so it can never fill a bold glyph's full
  // interior. Grading coverage against the full bold shape quietly capped
  // even a genuinely good trace's score well below what it visually deserved
  // (a drawing that looked like a clean 90% match could score ~60%).
  // CORE_WEIGHT builds a second, *thinner*-stroke rendering of the very same
  // glyph (same size, same position) purely as coverage's target — it asks
  // "did the ink pass through the letter's own stroke path?" instead of "did
  // the ink fill this bold glyph edge-to-edge?". The glyph's actual bold
  // rendering (and a halo around it) is still what precision is graded
  // against, so ink that strays off the true shape is still marked down.
  const CORE_WEIGHT = 500;

  // A real hand-drawn letter — especially on a touch screen, especially with
  // no printed outline underneath in Practice mode — is essentially never the
  // same size or position as the printed glyph, and its proportions can be a
  // bit taller/shorter or narrower/wider too. Rather than score that as
  // "wrong", scoreDrawing() re-fits the child's own ink onto the glyph's own
  // ink bounding box (independently per axis) before comparing shapes, so
  // grading tracks "is this legibly the right letter" rather than "does this
  // match the printed size/position exactly". Two guards keep that from being
  // gameable: a per-axis minimum extent refuses to stretch an axis that's
  // still too thin to be a real stroke (so a stray dot/tap can't be blown up
  // into "filled the box"), and NORMALIZE_MAX_SCALE caps how far anything can
  // be stretched either way.
  //
  // That minimum extent used to be a single fixed fraction of SCORE_SIZE
  // (NORMALIZE_MIN_EXTENT_RATIO alone), which quietly broke naturally
  // short/narrow glyphs: ఱు's vocalic-R vowel sign (ౠ), for example, is
  // itself only ~22px tall out of a 96px grid, so a fairly-drawn, correctly
  // *proportioned* smaller copy has a raw height well under the fixed
  // 14.4px floor and got refused a vertical stretch entirely — collapsing
  // its coverage even though the child drew it right. The floor now also
  // scales down with how short/narrow the glyph's *own* mask already is
  // (NORMALIZE_MIN_EXTENT_MASK_RATIO), so an axis only gets refused a
  // stretch when it's implausibly thin *relative to the letter it's
  // supposed to be*, not just thin in absolute pixels.
  const NORMALIZE_MIN_EXTENT_RATIO = 0.15;
  const NORMALIZE_MIN_EXTENT_MASK_RATIO = 0.4;
  const NORMALIZE_MAX_SCALE = 4;

  // ---------- Shape recognition ("did they actually draw the letter, or
  // just fill the space where it goes?") ----------
  //
  // coverage/precision (above) only ask "how much of the letter's stroke
  // path got inked" and "how much of the child's ink landed on the letter"
  // — both are purely about *area overlap* with the target shape. That
  // makes them gameable in a specific, important way a learning app can't
  // allow: a scribble that densely criss-crosses the whole drawing box
  // overlaps a large fraction of *any* letter's shape almost by accident,
  // since it has ink almost everywhere. Two real trace/practice attempts
  // in this app's own test suite exposed exactly that gap before this fix
  // (see the "dense fill scribble"/"dense zig-zag scribble" cases in
  // tests/test_scoring_calibration.py and tests/test_practice_mode.py).
  //
  // The fix asks a different, shape-aware question, based on how a human
  // actually judges "does this look like the letter": not just *whether*
  // ink landed on the shape, but whether the ink is *distributed* the way
  // the letter's own strokes are — dense where the letter has strokes,
  // sparse/empty in its gaps and counters, exactly like a person glancing
  // at both drawings would compare them. This is the classical OCR
  // "zoning" technique: divide the drawing into an N x N grid of zones,
  // build a density signature (how much ink is in each zone) for both the
  // child's drawing and the letter's own core stroke path, and measure how
  // well the two *patterns* correlate — not just how much they overlap.
  //
  // A scribble that fills the box roughly evenly produces a close-to-flat
  // density signature (every zone has similar ink), which has little to no
  // variance to correlate with anything — it reads as "not really shaped
  // like the letter" even where it happens to overlap the letter's area
  // well. A real trace's signature — dense in the letter's strokes, close
  // to empty in its background/counters — correlates strongly with the
  // letter's own signature, because it *is* the same pattern at a rough
  // approximation. This is deliberately independent of coverage/precision
  // (which measure area, not pattern) and independent of exact positioning
  // (grading is zone-level, not pixel-level, so it tolerates a wobbly hand).
  const SHAPE_GRID_N = 8; // an 8x8 zone grid over the SCORE_SIZE canvas
  const SHAPE_ZONE = SCORE_SIZE / SHAPE_GRID_N; // must divide SCORE_SIZE evenly
  // Trace-mode pass gate on the 0-1 shape score. Calibrated empirically
  // (see tests/test_shape_recognition.py) against this app's own test
  // fixtures: every real-attempt simulation this suite has — pixel-perfect
  // fills, weighted/jittered "good handwriting" fills, distorted (narrower/
  // shorter) copies, and even a thin *stroked outline* of the glyph rather
  // than a filled one (the least letter-shaped a real trace ever gets) —
  // scores shape >= ~0.87 across all 592 letters' representative sample.
  // Every scribble/scribble-like simulation (edge-hugging lines, a dense
  // zig-zag, a dense criss-cross fill, a plain solid block over the
  // letter's area) tops out around ~0.75, even on the widest glyphs where
  // scribbles get the most incidental help. 0.78 sits in the middle of
  // that gap with margin on both sides.
  const SHAPE_MIN_MATCH = 0.78;
  // percentScore() blends shape in as shape^SHAPE_SCORE_EXPONENT, not a
  // straight product and not a floor-cushioned one. A first version used a
  // floor (a minimum factor of 0.55 regardless of how low shape got), on
  // the theory that shape is a coarser, noisier signal than pixel-level
  // coverage/precision and shouldn't be able to crush an otherwise-good
  // score on its own — but real-world testing surfaced exactly the gap
  // that floor left open: a scribble that solidly fills the whole drawing
  // box trivially gets coverage=1.0 (every core pixel sits under solid
  // ink) and moderate-to-good precision (~0.45-0.76, since a filled
  // rectangle mostly-but-not-entirely overlaps the dilated mask), so shape
  // was the *only* thing standing between that scribble and a good score —
  // and a floor of 0.55 meant shape could reduce the final score by at
  // most 45%, letting a solid-fill scribble land around 45% overall, right
  // where it was reported. Squaring shape (no floor) keeps that same
  // "shape alone shouldn't crush a genuinely good match" property for real
  // attempts, whose shape is always high (>=0.85, so squaring only costs a
  // few points), while giving low/moderate shape values — exactly where
  // every scribble simulation in tests/test_shape_recognition.py lands —
  // a much steeper penalty than a linear floor ever could.
  const SHAPE_SCORE_EXPONENT = 2;

  // Pearson correlation coefficient between two equal-length numeric
  // vectors, i.e. "do these two patterns rise and fall together". Returns
  // 0 (not NaN) when either vector has ~zero variance — a flat, uniform
  // signature (an even scribble, or a totally empty grid) can't be said to
  // correlate with anything, positively or negatively.
  function pearsonCorrelation(a, b) {
    const n = a.length;
    let sumA = 0,
      sumB = 0;
    for (let i = 0; i < n; i++) {
      sumA += a[i];
      sumB += b[i];
    }
    const meanA = sumA / n,
      meanB = sumB / n;
    let num = 0,
      denA = 0,
      denB = 0;
    for (let i = 0; i < n; i++) {
      const da = a[i] - meanA,
        db = b[i] - meanB;
      num += da * db;
      denA += da * da;
      denB += db * db;
    }
    if (denA < 1e-9 || denB < 1e-9) return 0;
    return num / Math.sqrt(denA * denB);
  }

  const SUCCESS_MESSAGES = ["Great job!", "Wonderful!", "You did it!", "Super tracing!", "Amazing!"];
  const RETRY_MESSAGES = [
    "Nice try! Let's trace it again.",
    "Almost there — try once more!",
    "Keep going — trace inside the lines!",
    "So close! One more try!",
  ];
  const EMPTY_MESSAGES = ["Try tracing the letter first!", "Draw over the dotted letter to begin!"];
  const PRACTICE_EMPTY_MESSAGES = ["Draw the letter from memory to see your score!", "Give it a try — draw the letter in the box!"];

  // "Practice" mode: a blank box (no outline) where a percentage match score
  // replaces the pass/retry messaging, so a child can test how well they've
  // memorized a letter's shape after tracing it a few times.
  const PRACTICE_GREAT_MIN = 78; // >= this: celebrate + confetti
  const PRACTICE_OK_MIN = 45; // >= this: encouraging, but no confetti

  // ---------- Elements ----------
  const homeScreen = document.getElementById("home-screen");
  const practiceScreen = document.getElementById("practice-screen");
  const lessonListWrap = document.getElementById("lesson-list-wrap");
  const starTotalCount = document.getElementById("star-total-count");
  const starTotalMax = document.getElementById("star-total-max");

  const btnHome = document.getElementById("btn-home");
  const btnPrev = document.getElementById("btn-prev");
  const btnNext = document.getElementById("btn-next");
  const btnClear = document.getElementById("btn-clear");
  const btnDone = document.getElementById("btn-done");
  const btnDoneLabel = document.getElementById("btn-done-label");
  const btnSayLetter = document.getElementById("btn-say-letter");
  const btnSayWord = document.getElementById("btn-say-word");

  const progressPill = document.getElementById("progress-pill");
  const groupPill = document.getElementById("group-pill");
  const lessonPickerOverlay = document.getElementById("lesson-picker-overlay");
  const lessonPickerBackdrop = document.getElementById("lesson-picker-backdrop");
  const lessonPickerClose = document.getElementById("lesson-picker-close");
  const lessonPickerTitle = document.getElementById("lesson-picker-title");
  const lessonPickerSubtitle = document.getElementById("lesson-picker-subtitle");
  const lessonPickerGrid = document.getElementById("lesson-picker-grid");
  const bigLetterPreview = document.getElementById("big-letter-preview");
  const translitLabel = document.getElementById("translit-label");
  const wordTel = document.getElementById("word-tel");
  const wordTranslit = document.getElementById("word-translit");
  const wordMeaning = document.getElementById("word-meaning");
  const wordRow = document.getElementById("word-row");
  const noteRow = document.getElementById("note-row");
  const colorRow = document.getElementById("color-row");
  const celebrateOverlay = document.getElementById("celebrate-overlay");
  const celebrateText = document.getElementById("celebrate-text");
  const modeTraceBtn = document.getElementById("mode-trace");
  const modePracticeBtn = document.getElementById("mode-practice");
  const practiceBestBadge = document.getElementById("practice-best");

  const guideCanvas = document.getElementById("guide-canvas");
  const drawCanvas = document.getElementById("draw-canvas");
  const canvasWrap = document.querySelector(".canvas-wrap");
  const guideCtx = guideCanvas.getContext("2d");
  const drawCtx = drawCanvas.getContext("2d");

  // ---------- State ----------
  let currentLesson = LESSONS[0];
  let letterIndex = 0; // index within currentLesson.letters
  let currentColor = PEN_COLORS[0];
  let drawing = false;
  let lastPoint = null;
  let hasInk = false; // fast-path flag so an empty canvas never needs pixel sampling
  let busyGrading = false; // guards against double-taps on "I'm done"
  let practiceMode = false; // false = Trace (guided), true = Practice (blank, from memory)

  function currentLetter() {
    return currentLesson.letters[letterIndex];
  }

  // ---------- Progress (localStorage) ----------
  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }
  function saveProgress(progress) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (e) {
      /* ignore (private browsing etc.) */
    }
  }
  let progress = loadProgress();

  function markPracticed(id) {
    progress[id] = true;
    saveProgress(progress);
  }
  function practicedCount() {
    return Object.keys(progress).filter((k) => progress[k]).length;
  }
  function lessonPracticedCount(lesson) {
    return lesson.letters.filter((l) => progress[l.id]).length;
  }

  // ---------- Chapter expand/collapse (localStorage) ----------
  // Only ever holds a chapter id once the child has EXPLICITLY tapped its
  // header — until then a chapter's expanded/collapsed state is computed
  // fresh each time (see buildLessonList), so newly-earned progress keeps
  // steering which chapter opens by default.
  function loadChapterUI() {
    try {
      const raw = localStorage.getItem(CHAPTER_UI_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }
  function saveChapterUI(overrides) {
    try {
      localStorage.setItem(CHAPTER_UI_KEY, JSON.stringify(overrides));
    } catch (e) {
      /* ignore (private browsing etc.) */
    }
  }

  // ---------- Practice-mode best scores (localStorage, separate from trace progress) ----------
  function loadPracticeBest() {
    try {
      const raw = localStorage.getItem(PRACTICE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }
  function savePracticeBest() {
    try {
      localStorage.setItem(PRACTICE_KEY, JSON.stringify(practiceBest));
    } catch (e) {
      /* ignore (private browsing etc.) */
    }
  }
  let practiceBest = loadPracticeBest();

  function recordPracticeScore(id, pct) {
    if (typeof practiceBest[id] !== "number" || pct > practiceBest[id]) {
      practiceBest[id] = pct;
      savePracticeBest();
    }
  }

  // ---------- Home screen: build the Lessons list ----------
  function buildLessonCard(lesson) {
    const done = lessonPracticedCount(lesson);
    const total = lesson.letters.length;
    const complete = done === total;

    const card = document.createElement("button");
    card.className = "lesson-card";
    card.setAttribute("aria-label", `${lesson.title}: ${lesson.subtitle}`);

    const num = document.createElement("div");
    num.className = "lesson-num";
    num.textContent = String(lesson.id + 1);

    const body = document.createElement("div");
    body.className = "lesson-card-body";

    const titleRow = document.createElement("div");
    titleRow.className = "lesson-title-row";
    const title = document.createElement("div");
    title.className = "lesson-title";
    title.textContent = lesson.title;
    const stars = document.createElement("div");
    stars.className = "lesson-stars";
    stars.textContent = `${done} / ${total} ⭐`;
    titleRow.appendChild(title);
    titleRow.appendChild(stars);

    const subtitle = document.createElement("div");
    subtitle.className = "lesson-subtitle";
    subtitle.textContent = lesson.subtitle;

    const preview = document.createElement("div");
    preview.className = "lesson-preview";
    let curCluster = null;
    let clusterEl = null;
    lesson.letters.forEach((letter) => {
      if (letter.cluster !== curCluster) {
        curCluster = letter.cluster;
        clusterEl = document.createElement("span");
        clusterEl.className = "cluster-group";
        preview.appendChild(clusterEl);
      }
      const tile = document.createElement("span");
      tile.className = "mini-tile tel" + (progress[letter.id] ? " practiced" : "");
      tile.textContent = letter.telugu;
      clusterEl.appendChild(tile);
    });

    body.appendChild(titleRow);
    body.appendChild(subtitle);
    body.appendChild(preview);

    card.appendChild(num);
    card.appendChild(body);

    if (complete) {
      card.insertAdjacentHTML(
        "beforeend",
        '<svg class="lesson-check" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#43B26D" stroke="#fff" stroke-width="2"/><path d="M7.5 12.5l3 3 6-6.5" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      );
    }

    card.addEventListener("click", () => {
      currentLesson = lesson;
      // Resume at the first not-yet-practiced letter in the lesson, so
      // returning kids pick up where they left off.
      const resumeAt = lesson.letters.findIndex((l) => !progress[l.id]);
      letterIndex = resumeAt === -1 ? 0 : resumeAt;
      showPracticeScreen();
    });

    return card;
  }

  // Lessons are grouped into Chapters (Chapter 1: the alphabet itself,
  // Chapter 2: each consonant's full గుణింతం row of vowel-sign
  // combinations) — each chapter gets its own heading and its own
  // "card list", so a child (or parent) can see the two kinds of practice
  // as clearly separate sections rather than one long undifferentiated list.
  //
  // To keep the home screen from feeling overwhelming (48 lessons total),
  // each chapter's list can collapse to just its header. By default, the
  // chapter a child is *currently working through* (the first one that
  // isn't 100% complete, in chapter order) opens automatically and the
  // rest stay tucked away — but a tap on any header always toggles that
  // one chapter, and that explicit choice is remembered (localStorage)
  // and wins over the default from then on.
  function buildLessonList() {
    lessonListWrap.innerHTML = "";

    const chapterOverrides = loadChapterUI();

    const chapterStats = CHAPTERS.map((chapter) => {
      const lessons = LESSONS.filter((l) => l.chapter === chapter.id);
      const totalLetters = lessons.reduce((sum, l) => sum + l.letters.length, 0);
      const doneLetters = lessons.reduce((sum, l) => sum + lessonPracticedCount(l), 0);
      return { chapter, lessons, totalLetters, doneLetters, complete: totalLetters > 0 && doneLetters === totalLetters };
    });
    // The chapter currently "in progress": the first, in chapter order,
    // that isn't finished yet. If every chapter is complete, none gets an
    // automatic default — everything stays tucked away for a tidy "all
    // done" view (still one tap away to reopen and review).
    const inProgress = chapterStats.find((s) => !s.complete);

    chapterStats.forEach(({ chapter, lessons, doneLetters, totalLetters, complete }) => {
      if (!lessons.length) return;

      const doneLessons = lessons.filter((l) => lessonPracticedCount(l) === l.letters.length).length;
      const defaultExpanded = !!inProgress && inProgress.chapter.id === chapter.id;
      const hasOverride = Object.prototype.hasOwnProperty.call(chapterOverrides, chapter.id);
      const expanded = hasOverride ? chapterOverrides[chapter.id] : defaultExpanded;
      const listId = `chapter-list-${chapter.id}`;

      const header = document.createElement("button");
      header.type = "button";
      header.className = "chapter-header" + (expanded ? " expanded" : "");
      header.setAttribute("aria-expanded", String(expanded));
      header.setAttribute("aria-controls", listId);
      header.innerHTML = `
        <div class="chapter-heading">
          <div class="chapter-title">${chapter.title}</div>
          <div class="chapter-subtitle">${chapter.subtitle}</div>
        </div>
        <div class="chapter-header-right">
          <div class="chapter-progress">${doneLessons} / ${lessons.length} lessons</div>
          <span class="chapter-chevron" aria-hidden="true">▾</span>
        </div>
      `;

      const list = document.createElement("div");
      list.id = listId;
      list.className = "lesson-list" + (expanded ? "" : " collapsed");
      lessons.forEach((lesson) => list.appendChild(buildLessonCard(lesson)));

      header.addEventListener("click", () => {
        const nowExpanded = list.classList.contains("collapsed");
        list.classList.toggle("collapsed", !nowExpanded);
        header.classList.toggle("expanded", nowExpanded);
        header.setAttribute("aria-expanded", String(nowExpanded));
        const overrides = loadChapterUI();
        overrides[chapter.id] = nowExpanded;
        saveChapterUI(overrides);
      });

      lessonListWrap.appendChild(header);
      lessonListWrap.appendChild(list);
    });

    starTotalCount.textContent = practicedCount();
    starTotalMax.textContent = LETTERS.length;
  }

  function showHomeScreen() {
    closeLessonPicker();
    buildLessonList();
    practiceScreen.classList.add("hidden");
    homeScreen.classList.remove("hidden");
    window.scrollTo(0, 0);
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  }

  // ---------- Canvas setup (device-pixel-ratio aware, crisp on retina/iPad) ----------
  // Tracks the canvas-wrap's last-known CSS size so a spurious resize event
  // (mobile toolbar show/hide, a full-page screenshot tool, etc.) that leaves
  // the canvas's actual size unchanged never wipes a child's in-progress drawing.
  let lastCanvasSize = { w: 0, h: 0 };

  function setupCanvasSize(preserveDrawing) {
    const rect = guideCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // If the canvas is genuinely being resized (e.g. device rotation) and asked
    // to preserve the drawing, snapshot it first — resizing a canvas element
    // otherwise clears its bitmap.
    let snapshot = null;
    if (preserveDrawing && drawCanvas.width > 0 && drawCanvas.height > 0) {
      snapshot = document.createElement("canvas");
      snapshot.width = drawCanvas.width;
      snapshot.height = drawCanvas.height;
      snapshot.getContext("2d").drawImage(drawCanvas, 0, 0);
    }

    [guideCanvas, drawCanvas].forEach((c) => {
      c.width = Math.round(rect.width * dpr);
      c.height = Math.round(rect.height * dpr);
    });
    guideCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawCtx.lineCap = "round";
    drawCtx.lineJoin = "round";
    drawCtx.lineWidth = Math.max(10, rect.width * 0.045);

    if (snapshot) {
      drawCtx.drawImage(snapshot, 0, 0, snapshot.width / dpr, snapshot.height / dpr);
    }

    lastCanvasSize = { w: rect.width, h: rect.height };
    return rect;
  }

  // Computes a font size + visually-centered anchor point for drawing a
  // glyph into a w x h box, used identically for both the guide layer and
  // the trace-accuracy mask so the two always line up exactly.
  //
  // This used to trust ctx.measureText()'s actualBoundingBox* metrics to
  // find the glyph's true ink extent (both for the shrink-to-fit check and
  // for centering). That metric turned out to be unreliable for Telugu
  // conjuncts/vowel-sign combinations on WebKit/Safari (iPadOS/iOS) —
  // letters would render visibly off-center (typically shifted right) and
  // sometimes clip against the canvas edge, even though the same code
  // measured and centered correctly in Chromium. Rather than trust ANY
  // browser's text-metrics API, this now renders the glyph to a scratch
  // canvas and reads back the actual painted pixels (inkBBox) to find its
  // real ink extent — a canvas cannot lie about what it actually rendered,
  // so this is correct on every browser by construction, not by testing
  // against whichever ones happen to be available to check.
  const GUIDE_BASE_RATIO = 0.68;
  const GUIDE_MAX_INK_RATIO = 0.82;
  const INK_ALPHA_THRESHOLD = 40;

  function computeGlyphLayout(telugu, w, h) {
    // Probing must happen on a plain, never-transformed canvas whose pixel
    // grid is exactly w x h. getImageData() always reads back *physical*
    // canvas pixels and completely ignores ctx.setTransform() — so probing
    // directly on a live canvas that has a devicePixelRatio scale applied
    // (as every on-screen drawing canvas in this app does, via
    // setupCanvasSize's ctx.setTransform(dpr, 0, 0, dpr, ...)) samples the
    // wrong region of the backing store on any device where dpr != 1 — i.e.
    // effectively every iPad/iPhone/Android device. That's exactly why the
    // guide glyph could still render off-center in real use even after
    // switching from measureText() to pixel-probing: the probing itself was
    // reading a scaled-down corner of the real ink, not the whole glyph. A
    // dedicated scratch canvas that's never transformed measures in the same
    // coordinate space it draws in on every device, always — a canvas
    // cannot lie about what it actually rendered, and this way it's never
    // asked to.
    const pw = Math.max(1, Math.ceil(w));
    const ph = Math.max(1, Math.ceil(h));
    const probeCanvas = document.createElement("canvas");
    probeCanvas.width = pw;
    probeCanvas.height = ph;
    const ctx = probeCanvas.getContext("2d");
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Renders the glyph at the given size/anchor purely to read back where
    // its ink actually landed. Always clears ctx before returning so the
    // caller (or the next probe) starts from a clean canvas.
    function probeInk(size, ax, ay) {
      ctx.clearRect(0, 0, pw, ph);
      ctx.font = `900 ${size}px "Noto Sans Telugu", sans-serif`;
      ctx.fillStyle = "#000";
      ctx.fillText(telugu, ax, ay);
      const box = inkBBox(ctx.getImageData(0, 0, pw, ph).data, pw, ph);
      ctx.clearRect(0, 0, pw, ph);
      return box;
    }

    const maxW = w * GUIDE_MAX_INK_RATIO;
    const maxH = h * GUIDE_MAX_INK_RATIO;

    let size = w * GUIDE_BASE_RATIO;
    let anchorX = w / 2;
    let anchorY = h / 2;

    // Iterate: measure -> recenter on the actual ink -> shrink if it's
    // still too big -> re-verify. A single measure-and-shrink pass can
    // leave a razor-thin (sub-pixel-rounding) margin for some conjuncts
    // once the scale is applied, which font hinting at the new size can
    // then tip back into clipping — so this re-checks the *actual* result
    // at each step instead of trusting one computed scale factor, and
    // keeps a small safety margin below the nominal max-ink ratio.
    for (let attempt = 0; attempt < 8; attempt++) {
      const box = probeInk(size, anchorX, anchorY);
      if (!box) break; // no ink measured — nothing more this can correct

      anchorX += w / 2 - (box.minX + box.w / 2);
      anchorY += h / 2 - (box.minY + box.h / 2);

      if (box.w > maxW || box.h > maxH) {
        const scale = Math.min(maxW / box.w, maxH / box.h) * 0.96;
        size *= scale;
        continue; // re-measure at the new size before trusting it
      }

      // Re-probe once more at the corrected anchor (centering shifts where
      // the ink actually lands) and confirm it's genuinely inside the box.
      const check = probeInk(size, anchorX, anchorY);
      if (check && check.minX >= 0 && check.maxX < w && check.minY >= 0 && check.maxY < h) {
        return { size, anchorX, anchorY };
      }
      size *= 0.97; // still clipping somehow (rounding/hinting) — nudge down and retry
    }

    return { size, anchorX, anchorY };
  }

  function paintGuide(letter, rect) {
    guideCtx.clearRect(0, 0, rect.width, rect.height);

    guideCtx.lineWidth = Math.max(3, rect.width * 0.012);
    guideCtx.setLineDash([rect.width * 0.018, rect.width * 0.02]);
    guideCtx.strokeStyle = "#C9C6DD";

    const layout = computeGlyphLayout(letter.telugu, rect.width, rect.height);
    guideCtx.font = `900 ${layout.size}px "Noto Sans Telugu", sans-serif`;
    guideCtx.textAlign = "center";
    guideCtx.textBaseline = "middle";
    guideCtx.strokeText(letter.telugu, layout.anchorX, layout.anchorY);
  }

  // Full redraw for a *new* letter: fresh guide, and the drawing layer is
  // deliberately cleared (a new letter always starts blank). In Practice
  // mode the guide layer is deliberately left blank — no outline — so the
  // child draws the letter purely from memory.
  function drawGuide(letter) {
    const rect = setupCanvasSize(false);
    drawCtx.clearRect(0, 0, rect.width, rect.height);
    hasInk = false;
    scoreMaskCache = null;
    if (practiceMode) {
      guideCtx.clearRect(0, 0, rect.width, rect.height);
    } else {
      paintGuide(letter, rect);
    }
  }

  // Called only on window resize: re-measures the canvas and, if its CSS
  // size actually changed (e.g. a real orientation change — not just a
  // browser-chrome show/hide or an off-screen capture), preserves whatever
  // the child had already drawn instead of wiping it.
  function handleCanvasResize() {
    if (practiceScreen.classList.contains("hidden")) return;
    const rect = guideCanvas.getBoundingClientRect();
    const changed = Math.round(rect.width) !== Math.round(lastCanvasSize.w) || Math.round(rect.height) !== Math.round(lastCanvasSize.h);
    if (!changed) return;
    const newRect = setupCanvasSize(true);
    scoreMaskCache = null;
    if (!practiceMode) paintGuide(currentLetter(), newRect);
  }

  function clearDrawing() {
    const rect = guideCanvas.getBoundingClientRect();
    drawCtx.clearRect(0, 0, rect.width, rect.height);
    hasInk = false;
  }

  // ---------- Pointer drawing ----------
  function getPos(evt) {
    const rect = drawCanvas.getBoundingClientRect();
    return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
  }
  function pointerDown(evt) {
    drawing = true;
    hasInk = true;
    drawCanvas.setPointerCapture(evt.pointerId);
    lastPoint = getPos(evt);
    drawCtx.strokeStyle = currentColor;
    drawCtx.beginPath();
    drawCtx.moveTo(lastPoint.x, lastPoint.y);
    drawCtx.lineTo(lastPoint.x + 0.01, lastPoint.y + 0.01);
    drawCtx.stroke();
    evt.preventDefault();
  }
  function pointerMove(evt) {
    if (!drawing) return;
    const p = getPos(evt);
    drawCtx.strokeStyle = currentColor;
    drawCtx.beginPath();
    drawCtx.moveTo(lastPoint.x, lastPoint.y);
    drawCtx.lineTo(p.x, p.y);
    drawCtx.stroke();
    lastPoint = p;
    evt.preventDefault();
  }
  function pointerUp(evt) {
    drawing = false;
    lastPoint = null;
  }

  drawCanvas.addEventListener("pointerdown", pointerDown);
  drawCanvas.addEventListener("pointermove", pointerMove);
  drawCanvas.addEventListener("pointerup", pointerUp);
  drawCanvas.addEventListener("pointercancel", pointerUp);
  drawCanvas.addEventListener("pointerleave", pointerUp);

  // ---------- Color palette ----------
  function buildColorRow() {
    colorRow.innerHTML = "";
    PEN_COLORS.forEach((color, i) => {
      const dot = document.createElement("button");
      dot.className = "color-dot" + (color === currentColor ? " active" : "");
      dot.style.background = color;
      dot.setAttribute("aria-label", "Choose pen color");
      dot.addEventListener("click", () => {
        currentColor = color;
        [...colorRow.children].forEach((c) => c.classList.remove("active"));
        dot.classList.add("active");
      });
      colorRow.appendChild(dot);
    });
  }

  // ---------- Speech (Web Speech API) ----------
  // Browsers expose a Telugu voice (if any) asynchronously — on first load
  // getVoices() can return an empty list until 'voiceschanged' fires. We pick
  // the best-available Telugu voice once and cache it, instead of leaving the
  // browser to guess from a bare "te-IN" lang string (which on many
  // platforms silently falls back to a default/English voice with wrong
  // pronunciation).
  let teluguVoice = null;
  let voiceReady = false;

  function pickTeluguVoice() {
    if (!("speechSynthesis" in window)) return;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || !voices.length) return;
    voiceReady = true;
    teluguVoice =
      voices.find((v) => /^te(-|_|$)/i.test(v.lang)) ||
      voices.find((v) => /telugu/i.test(v.name)) ||
      null;
  }
  if ("speechSynthesis" in window) {
    pickTeluguVoice();
    window.speechSynthesis.addEventListener("voiceschanged", pickTeluguVoice);
  }

  function speak(text, lang) {
    if (!("speechSynthesis" in window) || !text) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      if (teluguVoice) {
        utter.voice = teluguVoice;
        utter.lang = teluguVoice.lang;
      } else {
        utter.lang = lang || "te-IN";
      }
      utter.rate = 0.8;
      utter.pitch = 1.05;
      window.speechSynthesis.speak(utter);
    } catch (e) {
      /* speech not available — silently ignore, UI still works */
    }
  }

  // ---------- Trace-accuracy scoring ----------
  // The guide shows a dashed outline of the letter; a good trace fills in
  // roughly that shape. We build THREE masks from the same glyph (same
  // layout, so they're all perfectly aligned with each other and with the
  // guide) and compare them, at coarse resolution, against what the child
  // actually drew:
  //   - a SOLID mask (the glyph's bold fill, no padding) — used only to find
  //     the glyph's own ink bounding box for size/position normalization
  //     (see NORMALIZE_* above); not used for scoring directly.
  //   - a CORE mask (the same glyph, same size/position, but rendered at a
  //     much thinner font weight) — coverage is measured against this, so
  //     it answers "did the ink pass through the letter's real stroke path?"
  //     rather than "did the ink fill this bold glyph's full thickness?",
  //     which a real pen stroke can actually achieve.
  //   - a DILATED mask (the bold solid fill plus a soft tolerance halo) —
  //     precision is measured against this, so a reasonably-close-but-not-
  //     exact trace (a kid's real hand) isn't punished for drifting a few
  //     pixels off the exact outline, while ink that lands well outside the
  //     letter's shape still counts against them.
  // Using different masks for the two metrics (rather than one mask for
  // both) means neither metric is diluted by pixels the other was never
  // meant to require, so a genuinely accurate trace can score close to 100%.
  let scoreMaskCache = null; // { letterId, coreData, dilatedData, maskBox }

  // Scans an RGBA buffer for its ink bounding box (alpha > INK_ALPHA_THRESHOLD), in pixel
  // coordinates. Returns null if there's no ink at all.
  function inkBBox(data, w, h) {
    let minX = w,
      minY = h,
      maxX = -1,
      maxY = -1;
    for (let y = 0; y < h; y++) {
      const rowOffset = y * w;
      for (let x = 0; x < w; x++) {
        if (data[(rowOffset + x) * 4 + 3] > INK_ALPHA_THRESHOLD) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) return null;
    return { minX, minY, maxX, maxY, w: maxX - minX + 1, h: maxY - minY + 1 };
  }

  function buildMasks(letter) {
    const solid = document.createElement("canvas");
    solid.width = SCORE_SIZE;
    solid.height = SCORE_SIZE;
    const sctx = solid.getContext("2d");
    // Same layout function as the guide (base size + per-glyph shrink-to-fit
    // + ink-centered anchor), at the mask's own resolution, so every mask
    // always matches what the guide actually shows on screen. The layout
    // (size + anchor) is computed once here, at the guide's own bold weight,
    // and reused as-is for the core mask below — only the font *weight*
    // changes, not the position or size, so the two stay concentric.
    const layout = computeGlyphLayout(letter.telugu, SCORE_SIZE, SCORE_SIZE);
    sctx.textAlign = "center";
    sctx.textBaseline = "middle";
    sctx.font = `900 ${layout.size}px "Noto Sans Telugu", sans-serif`;
    sctx.fillStyle = "#000";
    sctx.fillText(letter.telugu, layout.anchorX, layout.anchorY);

    const core = document.createElement("canvas");
    core.width = SCORE_SIZE;
    core.height = SCORE_SIZE;
    const cctx = core.getContext("2d");
    cctx.textAlign = "center";
    cctx.textBaseline = "middle";
    cctx.font = `${CORE_WEIGHT} ${layout.size}px "Noto Sans Telugu", sans-serif`;
    cctx.fillStyle = "#000";
    cctx.fillText(letter.telugu, layout.anchorX, layout.anchorY);

    const dilated = document.createElement("canvas");
    dilated.width = SCORE_SIZE;
    dilated.height = SCORE_SIZE;
    const dctx = dilated.getContext("2d");
    dctx.textAlign = "center";
    dctx.textBaseline = "middle";
    dctx.font = `900 ${layout.size}px "Noto Sans Telugu", sans-serif`;
    dctx.fillStyle = "#000";
    dctx.fillText(letter.telugu, layout.anchorX, layout.anchorY);
    dctx.lineWidth = SCORE_SIZE * DILATE_RATIO;
    dctx.strokeStyle = "#000";
    dctx.strokeText(letter.telugu, layout.anchorX, layout.anchorY);

    const solidData = sctx.getImageData(0, 0, SCORE_SIZE, SCORE_SIZE).data;
    let coreData = cctx.getImageData(0, 0, SCORE_SIZE, SCORE_SIZE).data;
    const dilatedData = dctx.getImageData(0, 0, SCORE_SIZE, SCORE_SIZE).data;
    const maskBox = inkBBox(solidData, SCORE_SIZE, SCORE_SIZE);

    // A handful of very thin marks (e.g. the anusvara dot ం) can all but
    // vanish at the lighter core weight. If the core came out empty (or
    // tiny) for a glyph that clearly does have ink at the bold weight, fall
    // back to the bold fill itself as the core — better a slightly stricter
    // target than a mask with (near-)nothing to hit.
    let coreCount = 0;
    for (let i = 3; i < coreData.length; i += 4) if (coreData[i] > INK_ALPHA_THRESHOLD) coreCount++;
    if (coreCount < 8 && maskBox) {
      coreData = solidData;
    }

    return { coreData, dilatedData, maskBox };
  }

  function getMasks(letter) {
    if (!scoreMaskCache || scoreMaskCache.letterId !== letter.id) {
      scoreMaskCache = { letterId: letter.id, ...buildMasks(letter) };
    }
    return scoreMaskCache;
  }

  function scoreDrawing(letter) {
    const { coreData, dilatedData, maskBox } = getMasks(letter);

    // Downsample the child's full-resolution drawing once.
    const sample = document.createElement("canvas");
    sample.width = SCORE_SIZE;
    sample.height = SCORE_SIZE;
    const sctx = sample.getContext("2d");
    sctx.drawImage(drawCanvas, 0, 0, drawCanvas.width, drawCanvas.height, 0, 0, SCORE_SIZE, SCORE_SIZE);
    const rawData = sctx.getImageData(0, 0, SCORE_SIZE, SCORE_SIZE).data;

    let rawInkCount = 0;
    for (let i = 3; i < rawData.length; i += 4) if (rawData[i] > INK_ALPHA_THRESHOLD) rawInkCount++;

    if (rawInkCount < MIN_INK_PIXELS || !maskBox) {
      return { coverage: 0, precision: 0, shape: 0, drawCount: rawInkCount, maskCount: 0 };
    }

    // Re-fit the child's ink onto the glyph's own ink bounding box (see the
    // NORMALIZE_* comment above) before comparing shapes. Only ever scales
    // UP, never down: a small/offset drawing gets magnified to a fair size
    // before grading, but a scribble already as big as (or bigger than) the
    // letter never gets shrunk to fit inside it — shrinking would let a
    // scribble spanning the whole box cheat its way to a tight-looking
    // match, exactly the "filled the whole box" trick the scorer must not
    // reward.
    let scoredData = rawData;
    const srcBox = inkBBox(rawData, SCORE_SIZE, SCORE_SIZE);
    if (srcBox) {
      const minExtentX = Math.min(SCORE_SIZE * NORMALIZE_MIN_EXTENT_RATIO, maskBox.w * NORMALIZE_MIN_EXTENT_MASK_RATIO);
      const minExtentY = Math.min(SCORE_SIZE * NORMALIZE_MIN_EXTENT_RATIO, maskBox.h * NORMALIZE_MIN_EXTENT_MASK_RATIO);
      let scaleX = srcBox.w >= minExtentX ? maskBox.w / srcBox.w : 1;
      let scaleY = srcBox.h >= minExtentY ? maskBox.h / srcBox.h : 1;
      scaleX = Math.min(NORMALIZE_MAX_SCALE, Math.max(1, scaleX));
      scaleY = Math.min(NORMALIZE_MAX_SCALE, Math.max(1, scaleY));

      if (scaleX !== 1 || scaleY !== 1) {
        const destW = srcBox.w * scaleX;
        const destH = srcBox.h * scaleY;
        const destX = maskBox.minX + (maskBox.w - destW) / 2;
        const destY = maskBox.minY + (maskBox.h - destH) / 2;

        const norm = document.createElement("canvas");
        norm.width = SCORE_SIZE;
        norm.height = SCORE_SIZE;
        const nctx = norm.getContext("2d");
        nctx.drawImage(sample, srcBox.minX, srcBox.minY, srcBox.w, srcBox.h, destX, destY, destW, destH);
        scoredData = nctx.getImageData(0, 0, SCORE_SIZE, SCORE_SIZE).data;
      }
    }

    let coreCount = 0,
      scoredInkCount = 0,
      insideCoreCount = 0,
      insideDilatedCount = 0;
    // Per-zone ink tallies for the shape/pattern-match check (see the
    // SHAPE_* comment above) — accumulated in this same pass rather than a
    // second scan over the pixel data.
    const zoneCount = SHAPE_GRID_N * SHAPE_GRID_N;
    const coreZones = new Float64Array(zoneCount);
    const drawZones = new Float64Array(zoneCount);
    const n = SCORE_SIZE * SCORE_SIZE;
    for (let i = 0; i < n; i++) {
      const a = i * 4 + 3;
      const coreInk = coreData[a] > INK_ALPHA_THRESHOLD;
      const dilatedInk = dilatedData[a] > INK_ALPHA_THRESHOLD;
      const drawInk = scoredData[a] > INK_ALPHA_THRESHOLD;
      if (coreInk) coreCount++;
      if (drawInk) {
        scoredInkCount++;
        if (coreInk) insideCoreCount++;
        if (dilatedInk) insideDilatedCount++;
      }
      if (coreInk || drawInk) {
        const x = i % SCORE_SIZE;
        const y = (i - x) / SCORE_SIZE;
        const zone = ((y / SHAPE_ZONE) | 0) * SHAPE_GRID_N + ((x / SHAPE_ZONE) | 0);
        if (coreInk) coreZones[zone]++;
        if (drawInk) drawZones[zone]++;
      }
    }

    const coverage = coreCount ? insideCoreCount / coreCount : 0;
    const precision = scoredInkCount ? insideDilatedCount / scoredInkCount : 0;
    // shape: how well the child's ink *pattern* (dense/sparse by zone)
    // correlates with the letter's own core-stroke pattern, independent of
    // how much area overlaps — see the SHAPE_* comment above. Clamped to
    // [0, 1]: a negative correlation is just as "not this letter" as no
    // correlation at all, for scoring purposes.
    const shape = Math.max(0, Math.min(1, pearsonCorrelation(coreZones, drawZones)));
    // drawCount reports the child's *actual* ink amount (not the resized
    // copy used for shape comparison) — it's only ever used to gate "did
    // they draw enough to grade at all", which must reflect the real attempt.
    return { coverage, precision, shape, drawCount: rawInkCount, maskCount: coreCount };
  }

  function gradeAttempt(letter) {
    if (!hasInk) return { verdict: "empty" };
    const result = scoreDrawing(letter);
    if (result.drawCount < MIN_INK_PIXELS) return { verdict: "empty", result };
    // shape >= SHAPE_MIN_MATCH is a hard, independent gate alongside
    // coverage/precision (see the SHAPE_* comment above scoreDrawing) — a
    // scribble that racks up moderate-to-good coverage and precision
    // purely by spanning a lot of the box still won't pass unless its ink
    // is actually *patterned* like the letter's own strokes, not just
    // sitting on top of them.
    const passed =
      result.coverage >= COVERAGE_MIN &&
      result.precision >= PRECISION_MIN &&
      result.shape >= SHAPE_MIN_MATCH &&
      percentScore(result) >= PASS_MATCH_MIN;
    return { verdict: passed ? "pass" : "retry", result };
  }

  // Turns a {coverage, precision, shape} triple into a single 0-100 "match"
  // percentage for Practice mode. coverage/precision are multiplied (not
  // averaged) for the reason explained where they're computed: a plain
  // average lets one so-so metric coast on the other being high, which is
  // exactly how a dense, spread-out scribble sneaks through — criss-crossing
  // enough of the box tends to rack up *moderate* coverage and *moderate*
  // precision at once (each around 0.5-0.7) purely by covering a lot of
  // ground. Multiplying punishes that hard (0.6 x 0.6 is only 0.36) while
  // barely denting a real letter, where both numbers are already high
  // (0.9 x 0.95 stays 0.85).
  //
  // shape is blended in as a third factor on top of that product, as
  // shape^SHAPE_SCORE_EXPONENT (see the constant's comment above for why
  // this replaced an earlier, too-forgiving floor-based version) — a
  // scribble that fills most of the box can still rack up coverage=1.0
  // (every core pixel sits under solid ink) and moderate-to-good precision
  // purely by covering a lot of ground, exactly the "kind of everywhere"
  // trick coverage/precision alone can't catch; squaring shape gives that
  // case a real, steep penalty while barely denting a real letter, where
  // shape is already high (0.95 squared is still 0.9).
  function percentScore(result) {
    if (!result || result.drawCount < MIN_INK_PIXELS) return 0;
    const { coverage, precision, shape } = result;
    const shapeFactor = Math.pow(Math.max(0, shape || 0), SHAPE_SCORE_EXPONENT);
    return Math.round(coverage * precision * shapeFactor * 100);
  }

  // ---------- Practice screen render ----------
  function renderPracticeScreen() {
    const letter = currentLetter();
    progressPill.textContent = `${letterIndex + 1} / ${currentLesson.letters.length}`;
    groupPill.textContent = currentLesson.title;
    bigLetterPreview.textContent = letter.telugu;
    translitLabel.textContent = letter.translit;

    if (letter.word) {
      wordRow.classList.remove("hidden");
      wordTel.textContent = letter.word;
      wordTranslit.textContent = `(${letter.wordTranslit})`;
      wordMeaning.textContent = `— ${letter.meaning}`;
    } else {
      wordRow.classList.add("hidden");
    }

    if (letter.note) {
      noteRow.textContent = "💡 " + letter.note;
      noteRow.classList.remove("hidden");
    } else {
      noteRow.classList.add("hidden");
    }

    btnPrev.disabled = letterIndex === 0;
    btnNext.disabled = letterIndex === currentLesson.letters.length - 1;
    btnPrev.style.opacity = btnPrev.disabled ? 0.35 : 1;
    btnNext.style.opacity = btnNext.disabled ? 0.35 : 1;

    updatePracticeBadge();
    drawGuide(letter);
  }

  function showPracticeScreen() {
    homeScreen.classList.add("hidden");
    practiceScreen.classList.remove("hidden");
    window.scrollTo(0, 0);
    buildColorRow();
    // Entering a lesson fresh from the Lessons list always starts in Trace
    // (guided) mode; Practice mode is something a child opts into per session.
    setPracticeMode(false);
    // Layout needs a frame to settle before we measure canvas size.
    requestAnimationFrame(renderPracticeScreen);
  }

  // ---------- Letter picker: jump to another character in this lesson ----------
  // Reachable from the practice screen (tapping the progress or lesson-name
  // pill) so a child can hop between the characters they're currently
  // working on without leaving the lesson or going all the way back Home.
  function buildLessonPickerGrid() {
    lessonPickerGrid.innerHTML = "";
    currentLesson.letters.forEach((letter, idx) => {
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "picker-tile tel" + (progress[letter.id] ? " practiced" : "") + (idx === letterIndex ? " current" : "");
      tile.setAttribute("aria-label", `${letter.translit}${idx === letterIndex ? " (current letter)" : ""}${progress[letter.id] ? " (already practiced)" : ""}`);
      tile.textContent = letter.telugu;
      if (progress[letter.id]) {
        tile.insertAdjacentHTML(
          "beforeend",
          '<svg class="picker-check" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#43B26D" stroke="#fff" stroke-width="2"/><path d="M7.5 12.5l3 3 6-6.5" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        );
      }
      tile.addEventListener("click", () => {
        closeLessonPicker();
        goTo(idx);
      });
      lessonPickerGrid.appendChild(tile);
    });
  }

  function openLessonPicker() {
    lessonPickerTitle.textContent = `${currentLesson.title} — ${currentLesson.subtitle}`;
    lessonPickerSubtitle.textContent = "Tap a letter to jump to it";
    buildLessonPickerGrid();
    lessonPickerOverlay.classList.remove("hidden");
  }
  function closeLessonPicker() {
    lessonPickerOverlay.classList.add("hidden");
  }

  function goTo(index) {
    if (index < 0 || index >= currentLesson.letters.length) return;
    letterIndex = index;
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    // Moving to a different letter (Prev/Next/arrow keys) always lands back
    // in Trace mode — Practice mode is the deliberate follow-up step right
    // after tracing *this* letter, not a mode that carries over between
    // letters (the next letter hasn't been traced yet).
    practiceMode = false;
    applyModeClasses();
    renderPracticeScreen();
  }

  // ---------- Trace / Practice mode toggle ----------
  function applyModeClasses() {
    modeTraceBtn.classList.toggle("active", !practiceMode);
    modePracticeBtn.classList.toggle("active", practiceMode);
    canvasWrap.classList.toggle("practice-mode", practiceMode);
  }

  function updatePracticeBadge() {
    if (!practiceMode) {
      practiceBestBadge.classList.add("hidden");
      return;
    }
    const best = practiceBest[currentLetter().id];
    if (typeof best === "number") {
      practiceBestBadge.textContent = `Best: ${best}%`;
      practiceBestBadge.classList.remove("hidden");
    } else {
      practiceBestBadge.classList.add("hidden");
    }
  }

  function setPracticeMode(on) {
    practiceMode = on;
    applyModeClasses();
    updatePracticeBadge();
    btnDoneLabel.textContent = on ? "See my score!" : "Check it!";
    // Re-render the guide layer for the new mode (blank vs. dashed outline)
    // and clear whatever was drawn, since switching modes mid-attempt
    // wouldn't make sense to score against either guide.
    if (!practiceScreen.classList.contains("hidden")) {
      drawGuide(currentLetter());
    }
  }

  // ---------- Celebration / retry ----------
  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function showOverlay(stateClass, text, durationMs, onDone) {
    celebrateOverlay.className = "celebrate-overlay " + stateClass;
    celebrateText.textContent = text;
    setTimeout(() => {
      celebrateOverlay.classList.add("hidden");
      if (onDone) onDone();
    }, durationMs);
  }

  function handleDone() {
    if (busyGrading) return;
    const letter = currentLetter();
    const grade = gradeAttempt(letter);

    if (grade.verdict === "empty") {
      busyGrading = true;
      showOverlay("state-retry", pick(EMPTY_MESSAGES), 1200, () => {
        busyGrading = false;
      });
      return;
    }

    if (grade.verdict === "retry") {
      busyGrading = true;
      showOverlay("state-retry", pick(RETRY_MESSAGES), 1500, () => {
        clearDrawing();
        busyGrading = false;
      });
      return;
    }

    // Passed!
    markPracticed(letter.id);
    const isLastInLesson = letterIndex === currentLesson.letters.length - 1;
    const lessonNowComplete = isLastInLesson && lessonPracticedCount(currentLesson) === currentLesson.letters.length;

    busyGrading = true;
    if (lessonNowComplete) {
      showOverlay("state-lesson", `Lesson complete! 🎉 Great work on all ${currentLesson.letters.length} letters!`, 2000, () => {
        busyGrading = false;
        showHomeScreen();
      });
    } else {
      // A good trace is followed by Practice on the *same* letter — drawing
      // it once from memory right away is much more useful for actually
      // learning the shape than immediately moving on to the next letter.
      showOverlay("state-success", `${pick(SUCCESS_MESSAGES)} Now try it from memory!`, 1500, () => {
        busyGrading = false;
        setPracticeMode(true);
      });
    }
  }

  // Practice mode's "I'm done": grades against the same accuracy scorer as
  // Trace mode, but always reports a percentage instead of a binary pass/
  // retry, and never auto-advances — the point is repeated attempts at the
  // *same* letter until the score (and the child's memory of the shape)
  // improves. Doesn't touch the Trace-mode "practiced" star/progress at all;
  // it has its own separate best-score record instead.
  function handlePracticeDone() {
    if (busyGrading) return;
    const letter = currentLetter();

    if (!hasInk) {
      busyGrading = true;
      showOverlay("state-retry", pick(PRACTICE_EMPTY_MESSAGES), 1300, () => {
        busyGrading = false;
      });
      return;
    }

    const result = scoreDrawing(letter);
    if (result.drawCount < MIN_INK_PIXELS) {
      busyGrading = true;
      showOverlay("state-retry", pick(PRACTICE_EMPTY_MESSAGES), 1300, () => {
        busyGrading = false;
      });
      return;
    }

    const pct = percentScore(result);
    recordPracticeScore(letter.id, pct);
    updatePracticeBadge();

    let stateClass, text;
    if (pct >= PRACTICE_GREAT_MIN) {
      stateClass = "state-success";
      text = `🎯 ${pct}% match! ${pick(SUCCESS_MESSAGES)}`;
    } else if (pct >= PRACTICE_OK_MIN) {
      stateClass = "state-retry";
      text = `🎯 ${pct}% match — good try! Draw it again to improve.`;
    } else {
      stateClass = "state-retry";
      text = `🎯 ${pct}% match — let's try that again!`;
    }

    busyGrading = true;
    showOverlay(stateClass, text, 1800, () => {
      clearDrawing();
      busyGrading = false;
    });
  }

  // ---------- Wire up controls ----------
  btnHome.addEventListener("click", showHomeScreen);
  btnPrev.addEventListener("click", () => goTo(letterIndex - 1));
  btnNext.addEventListener("click", () => goTo(letterIndex + 1));
  btnClear.addEventListener("click", clearDrawing);
  btnDone.addEventListener("click", () => (practiceMode ? handlePracticeDone() : handleDone()));
  modeTraceBtn.addEventListener("click", () => setPracticeMode(false));
  modePracticeBtn.addEventListener("click", () => setPracticeMode(true));
  btnSayLetter.addEventListener("click", () => speak(currentLetter().telugu, "te-IN"));
  btnSayWord.addEventListener("click", () => {
    const l = currentLetter();
    if (l.word) speak(l.word, "te-IN");
  });
  progressPill.addEventListener("click", openLessonPicker);
  groupPill.addEventListener("click", openLessonPicker);
  lessonPickerClose.addEventListener("click", closeLessonPicker);
  lessonPickerBackdrop.addEventListener("click", closeLessonPicker);

  window.addEventListener("keydown", (e) => {
    if (practiceScreen.classList.contains("hidden")) return;
    if (e.key === "Escape" && !lessonPickerOverlay.classList.contains("hidden")) {
      closeLessonPicker();
      return;
    }
    if (!lessonPickerOverlay.classList.contains("hidden")) return;
    if (e.key === "ArrowRight") goTo(letterIndex + 1);
    if (e.key === "ArrowLeft") goTo(letterIndex - 1);
  });

  window.addEventListener("resize", handleCanvasResize);

  // ---------- PWA: register service worker ----------
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {
        /* offline install is a nice-to-have, not required */
      });
    });
  }

  // If the practice screen is opened before the Noto Sans Telugu web font has
  // finished downloading, the guide glyph briefly draws with a fallback
  // font's (wrong) metrics. Canvas text doesn't auto-repaint when a web font
  // swaps in, so redraw once the browser reports fonts are ready.
  if (document.fonts && document.fonts.ready && document.fonts.ready.then) {
    document.fonts.ready.then(() => {
      if (!practiceScreen.classList.contains("hidden")) {
        // Repaint just the guide layer — never touch what the child has
        // already drawn. Practice mode's guide is deliberately blank, so
        // there's nothing to repaint there.
        scoreMaskCache = null;
        if (!practiceMode) paintGuide(currentLetter(), guideCanvas.getBoundingClientRect());
      }
    });
  }

  // ---------- Test hooks (harmless in production; used by the Playwright
  // suite to simulate drawings and inspect scoring without needing real
  // pointer gestures) ----------
  window.__vidyarthiTest = {
    getCurrentLetter: () => currentLetter(),
    getDrawCtx: () => drawCtx,
    getGuideRect: () => guideCanvas.getBoundingClientRect(),
    markHasInk: () => {
      hasInk = true;
    },
    scoreDrawing: () => scoreDrawing(currentLetter()),
    // Exposes the bounding-box-normalization intermediates from inside
    // scoreDrawing() (srcBox/maskBox/scaleX/scaleY) for diagnosing scoring
    // weaknesses tied to NORMALIZE_MIN_EXTENT_RATIO on extreme-aspect-ratio
    // glyphs — not used by the app itself, only by the test suite.
    debugNormalizeForTest: () => {
      const letter = currentLetter();
      const { maskBox } = getMasks(letter);
      const sample = document.createElement("canvas");
      sample.width = SCORE_SIZE;
      sample.height = SCORE_SIZE;
      const sctx = sample.getContext("2d");
      sctx.drawImage(drawCanvas, 0, 0, drawCanvas.width, drawCanvas.height, 0, 0, SCORE_SIZE, SCORE_SIZE);
      const rawData = sctx.getImageData(0, 0, SCORE_SIZE, SCORE_SIZE).data;
      const srcBox = inkBBox(rawData, SCORE_SIZE, SCORE_SIZE);
      if (!srcBox || !maskBox) return { srcBox, maskBox };
      const minExtentX = Math.min(SCORE_SIZE * NORMALIZE_MIN_EXTENT_RATIO, maskBox.w * NORMALIZE_MIN_EXTENT_MASK_RATIO);
      const minExtentY = Math.min(SCORE_SIZE * NORMALIZE_MIN_EXTENT_RATIO, maskBox.h * NORMALIZE_MIN_EXTENT_MASK_RATIO);
      let scaleX = srcBox.w >= minExtentX ? maskBox.w / srcBox.w : 1;
      let scaleY = srcBox.h >= minExtentY ? maskBox.h / srcBox.h : 1;
      scaleX = Math.min(NORMALIZE_MAX_SCALE, Math.max(1, scaleX));
      scaleY = Math.min(NORMALIZE_MAX_SCALE, Math.max(1, scaleY));
      return { srcBox, maskBox, minExtentX, minExtentY, scaleX, scaleY };
    },
    gradeAttempt: () => gradeAttempt(currentLetter()),
    isPracticeMode: () => practiceMode,
    getPracticeBest: () => ({ ...practiceBest }),
    getGuideInkCount: () => {
      const c = guideCanvas;
      const ctx = c.getContext("2d");
      const data = ctx.getImageData(0, 0, c.width, c.height).data;
      let n = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i] > INK_ALPHA_THRESHOLD) n++;
      return n;
    },
    // Paints a pixel-accurate fill of the current letter onto the draw
    // layer using the exact same layout (size + anchor) the scoring mask
    // itself uses, for testing the scorer's achievable ceiling in isolation
    // from any hand-drawn imprecision.
    paintPerfectFillForTest: () => {
      const letter = currentLetter();
      const rect = guideCanvas.getBoundingClientRect();
      const layout = computeGlyphLayout(letter.telugu, rect.width, rect.height);
      drawCtx.font = `900 ${layout.size}px "Noto Sans Telugu", sans-serif`;
      drawCtx.textAlign = "center";
      drawCtx.textBaseline = "middle";
      drawCtx.fillStyle = "#000";
      drawCtx.fillText(letter.telugu, layout.anchorX, layout.anchorY);
      hasInk = true;
    },
    // Paints a fill of the current letter at a given font *weight* (same
    // layout/position as every other test/scoring fill — only the weight
    // differs), optionally with a small random offset — for testing a
    // genuinely good but imperfect real fill (thinner-stroked and slightly
    // off-true than the bold printed guide) against the CORE-mask scoring
    // recalibration, without the test's own font-size math drifting out of
    // sync with computeGlyphLayout's ink-based auto-shrink (which the real
    // scoring masks always use).
    paintWeightedFillForTest: (weight, jitterFrac) => {
      const letter = currentLetter();
      const rect = guideCanvas.getBoundingClientRect();
      const layout = computeGlyphLayout(letter.telugu, rect.width, rect.height);
      const jitter = (jitterFrac || 0) * rect.width;
      const jx = (Math.random() * 2 - 1) * jitter;
      const jy = (Math.random() * 2 - 1) * jitter;
      drawCtx.font = `${weight || 900} ${layout.size}px "Noto Sans Telugu", sans-serif`;
      drawCtx.textAlign = "center";
      drawCtx.textBaseline = "middle";
      drawCtx.fillStyle = "#000";
      drawCtx.fillText(letter.telugu, layout.anchorX + jx, layout.anchorY + jy);
      hasInk = true;
    },
    // Paints a copy of the current letter shrunk by `scale` and shifted by
    // (offsetXFrac, offsetYFrac) of the box size from its normal centered
    // spot — for testing that a smaller/off-center but otherwise-correct
    // freehand copy still scores well after bounding-box normalization.
    paintScaledFillForTest: (scale, offsetXFrac, offsetYFrac) => {
      const letter = currentLetter();
      const rect = guideCanvas.getBoundingClientRect();
      const layout = computeGlyphLayout(letter.telugu, rect.width, rect.height);
      const size = layout.size * scale;
      drawCtx.font = `900 ${size}px "Noto Sans Telugu", sans-serif`;
      drawCtx.textAlign = "center";
      drawCtx.textBaseline = "middle";
      drawCtx.fillStyle = "#000";
      const ax = layout.anchorX + rect.width * (offsetXFrac || 0);
      const ay = layout.anchorY + rect.height * (offsetYFrac || 0);
      drawCtx.fillText(letter.telugu, ax, ay);
      hasInk = true;
    },
    // Paints a non-uniformly stretched copy of the current letter (different
    // scale per axis, optionally offset) — for testing letters drawn a bit
    // taller/shorter or narrower/wider than the printed glyph, not just
    // smaller.
    paintDistortedFillForTest: (scaleX, scaleY, offsetXFrac, offsetYFrac) => {
      const letter = currentLetter();
      const rect = guideCanvas.getBoundingClientRect();
      const layout = computeGlyphLayout(letter.telugu, rect.width, rect.height);
      const cx = layout.anchorX + rect.width * (offsetXFrac || 0);
      const cy = layout.anchorY + rect.height * (offsetYFrac || 0);
      drawCtx.save();
      drawCtx.translate(cx, cy);
      drawCtx.scale(scaleX, scaleY);
      drawCtx.translate(-layout.anchorX, -layout.anchorY);
      drawCtx.font = `900 ${layout.size}px "Noto Sans Telugu", sans-serif`;
      drawCtx.textAlign = "center";
      drawCtx.textBaseline = "middle";
      drawCtx.fillStyle = "#000";
      drawCtx.fillText(letter.telugu, layout.anchorX, layout.anchorY);
      drawCtx.restore();
      hasInk = true;
    },
    // Simulates a *realistic hand-drawn* attempt, as opposed to the
    // pixel-perfect fills above: strokes (does not fill) the actual bold
    // glyph's outline with a pen of the app's own real default width,
    // optionally wobbled with small per-segment jitter — this is what a
    // careful child's trace over the dashed guide actually looks like
    // (ink that follows the letter's path at realistic thickness, not a
    // solid-filled copy of the bold glyph), and is the scenario the
    // coverage-scoring recalibration (CORE_WEIGHT) targets. `jitterFrac`
    // is expressed as a fraction of the box width.
    paintRealisticStrokeForTest: (jitterFrac) => {
      const letter = currentLetter();
      const rect = guideCanvas.getBoundingClientRect();
      const layout = computeGlyphLayout(letter.telugu, rect.width, rect.height);
      const jitter = (jitterFrac || 0) * rect.width;
      drawCtx.save();
      if (jitter > 0) {
        // Canvas has no per-point jitter for strokeText, so approximate a
        // wobbly hand by stroking several slightly-offset copies at a
        // thinner width rather than one perfectly steady thick line —
        // closer to how a real pen wanders around the intended path.
        const steps = 5;
        drawCtx.lineWidth = Math.max(6, rect.width * 0.022);
        drawCtx.strokeStyle = "#000";
        drawCtx.textAlign = "center";
        drawCtx.textBaseline = "middle";
        for (let i = 0; i < steps; i++) {
          const dx = (Math.random() * 2 - 1) * jitter;
          const dy = (Math.random() * 2 - 1) * jitter;
          drawCtx.font = `900 ${layout.size}px "Noto Sans Telugu", sans-serif`;
          drawCtx.strokeText(letter.telugu, layout.anchorX + dx, layout.anchorY + dy);
        }
      } else {
        drawCtx.lineWidth = Math.max(10, rect.width * 0.045);
        drawCtx.strokeStyle = "#000";
        drawCtx.textAlign = "center";
        drawCtx.textBaseline = "middle";
        drawCtx.font = `900 ${layout.size}px "Noto Sans Telugu", sans-serif`;
        drawCtx.strokeText(letter.telugu, layout.anchorX, layout.anchorY);
      }
      drawCtx.restore();
      hasInk = true;
    },
    // Jumps straight to a given lesson/letter without clicking through the
    // UI, for automated sweeps over every letter (e.g. glyph-fit checks).
    gotoLetterForTest: (lesson, letter) => {
      if (homeScreen.classList.contains("hidden") === false) {
        currentLesson = lesson;
        letterIndex = lesson.letters.findIndex((l) => l.id === letter.id);
        showPracticeScreen();
      } else {
        currentLesson = lesson;
        letterIndex = lesson.letters.findIndex((l) => l.id === letter.id);
        renderPracticeScreen();
      }
    },
  };

  // ---------- Init ----------
  showHomeScreen();
})();
