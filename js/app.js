// app.js — Vidyarthi app logic (no dependencies, no build step).
(function () {
  "use strict";

  const STORAGE_KEY = "vidyarthi-progress-v1";
  const PEN_COLORS = ["#FF5D8F", "#3DA9FF", "#21BFA6", "#FFC93C", "#8C6BFF", "#33314A"];

  // ---------- Elements ----------
  const homeScreen = document.getElementById("home-screen");
  const practiceScreen = document.getElementById("practice-screen");
  const gridWrap = document.getElementById("letter-grid-wrap");
  const starTotalCount = document.getElementById("star-total-count");
  const starTotalMax = document.getElementById("star-total-max");

  const btnHome = document.getElementById("btn-home");
  const btnPrev = document.getElementById("btn-prev");
  const btnNext = document.getElementById("btn-next");
  const btnClear = document.getElementById("btn-clear");
  const btnDone = document.getElementById("btn-done");
  const btnSayLetter = document.getElementById("btn-say-letter");
  const btnSayWord = document.getElementById("btn-say-word");

  const progressPill = document.getElementById("progress-pill");
  const groupPill = document.getElementById("group-pill");
  const bigLetterPreview = document.getElementById("big-letter-preview");
  const translitLabel = document.getElementById("translit-label");
  const wordTel = document.getElementById("word-tel");
  const wordTranslit = document.getElementById("word-translit");
  const wordMeaning = document.getElementById("word-meaning");
  const wordRow = document.getElementById("word-row");
  const noteRow = document.getElementById("note-row");
  const colorRow = document.getElementById("color-row");
  const celebrateOverlay = document.getElementById("celebrate-overlay");

  const guideCanvas = document.getElementById("guide-canvas");
  const drawCanvas = document.getElementById("draw-canvas");
  const canvasWrap = document.querySelector(".canvas-wrap");
  const guideCtx = guideCanvas.getContext("2d");
  const drawCtx = drawCanvas.getContext("2d");

  // ---------- State ----------
  let currentIndex = 0;
  let currentColor = PEN_COLORS[0];
  let drawing = false;
  let lastPoint = null;

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

  // ---------- Home screen: build letter grid grouped by teaching section ----------
  function buildHomeGrid() {
    gridWrap.innerHTML = "";
    let currentGroup = null;
    let section = null;
    let grid = null;

    LETTERS.forEach((letter, idx) => {
      if (letter.group !== currentGroup) {
        currentGroup = letter.group;
        section = document.createElement("div");
        section.className = "group-section";
        const title = document.createElement("h2");
        title.className = "group-title";
        title.innerHTML =
          '<span class="icon"><svg viewBox="0 0 40 40"><g fill="#FF6FA5"><ellipse cx="20" cy="9" rx="6" ry="9"/><ellipse cx="31" cy="20" rx="9" ry="6"/><ellipse cx="20" cy="31" rx="6" ry="9"/><ellipse cx="9" cy="20" rx="9" ry="6"/></g><circle cx="20" cy="20" r="6" fill="#FFD54B"/></svg></span>' +
          `<span>${currentGroup}</span>`;
        section.appendChild(title);
        grid = document.createElement("div");
        grid.className = "letter-grid";
        section.appendChild(grid);
        gridWrap.appendChild(section);
      }
      const tile = document.createElement("button");
      tile.className = "letter-tile tel" + (progress[letter.id] ? " practiced" : "");
      tile.setAttribute("aria-label", `${letter.translit} letter`);
      const starBadge = progress[letter.id]
        ? '<svg class="star-badge" viewBox="0 0 24 24"><path fill="#FFC93D" stroke="#fff" stroke-width="1.5" stroke-linejoin="round" d="M12 2.5l2.9 6.3 6.9.7-5.2 4.7 1.5 6.8L12 17.6 5.9 21l1.5-6.8L2.2 9.5l6.9-.7L12 2.5Z"/></svg>'
        : "";
      tile.innerHTML = letter.telugu + starBadge;
      tile.addEventListener("click", () => {
        currentIndex = idx;
        showPracticeScreen();
      });
      grid.appendChild(tile);
    });

    starTotalCount.textContent = practicedCount();
    starTotalMax.textContent = LETTERS.length;
  }

  function showHomeScreen() {
    buildHomeGrid();
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
    const rect = canvasWrap.getBoundingClientRect();
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

  function paintGuide(letter, rect) {
    guideCtx.clearRect(0, 0, rect.width, rect.height);

    const size = rect.width * 0.68;
    guideCtx.font = `900 ${size}px "Noto Sans Telugu", sans-serif`;
    guideCtx.textAlign = "center";
    guideCtx.textBaseline = "middle";
    guideCtx.lineWidth = Math.max(3, rect.width * 0.012);
    guideCtx.setLineDash([rect.width * 0.018, rect.width * 0.02]);
    guideCtx.strokeStyle = "#C9C6DD";
    guideCtx.strokeText(letter.telugu, rect.width / 2, rect.height / 2 + rect.height * 0.03);

    // Faint starting-point dot to hint where little hands can begin.
    guideCtx.setLineDash([]);
    guideCtx.fillStyle = "#FFC93C";
    guideCtx.beginPath();
    guideCtx.arc(rect.width * 0.5 - size * 0.32, rect.height * 0.5 - size * 0.28, rect.width * 0.014, 0, Math.PI * 2);
    guideCtx.fill();
  }

  // Full redraw for a *new* letter: fresh guide, and the drawing layer is
  // deliberately cleared (a new letter always starts blank).
  function drawGuide(letter) {
    const rect = setupCanvasSize(false);
    drawCtx.clearRect(0, 0, rect.width, rect.height);
    paintGuide(letter, rect);
  }

  // Called only on window resize: re-measures the canvas and, if its CSS
  // size actually changed (e.g. a real orientation change — not just a
  // browser-chrome show/hide or an off-screen capture), preserves whatever
  // the child had already drawn instead of wiping it.
  function handleCanvasResize() {
    if (practiceScreen.classList.contains("hidden")) return;
    const rect = canvasWrap.getBoundingClientRect();
    const changed = Math.round(rect.width) !== Math.round(lastCanvasSize.w) || Math.round(rect.height) !== Math.round(lastCanvasSize.h);
    if (!changed) return;
    const newRect = setupCanvasSize(true);
    paintGuide(LETTERS[currentIndex], newRect);
  }

  function clearDrawing() {
    const rect = canvasWrap.getBoundingClientRect();
    drawCtx.clearRect(0, 0, rect.width, rect.height);
  }

  // ---------- Pointer drawing ----------
  function getPos(evt) {
    const rect = drawCanvas.getBoundingClientRect();
    return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
  }
  function pointerDown(evt) {
    drawing = true;
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
  function speak(text, lang) {
    if (!("speechSynthesis" in window) || !text) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = lang || "te-IN";
      utter.rate = 0.8;
      utter.pitch = 1.05;
      window.speechSynthesis.speak(utter);
    } catch (e) {
      /* speech not available — silently ignore, UI still works */
    }
  }

  // ---------- Practice screen render ----------
  function renderPracticeScreen() {
    const letter = LETTERS[currentIndex];
    progressPill.textContent = `${currentIndex + 1} / ${LETTERS.length}`;
    groupPill.textContent = letter.group;
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

    btnPrev.disabled = currentIndex === 0;
    btnNext.disabled = currentIndex === LETTERS.length - 1;
    btnPrev.style.opacity = btnPrev.disabled ? 0.35 : 1;
    btnNext.style.opacity = btnNext.disabled ? 0.35 : 1;

    drawGuide(letter);
  }

  function showPracticeScreen() {
    homeScreen.classList.add("hidden");
    practiceScreen.classList.remove("hidden");
    window.scrollTo(0, 0);
    buildColorRow();
    // Layout needs a frame to settle before we measure canvas size.
    requestAnimationFrame(renderPracticeScreen);
  }

  function goTo(index) {
    if (index < 0 || index >= LETTERS.length) return;
    currentIndex = index;
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    renderPracticeScreen();
  }

  // ---------- Celebration ----------
  function celebrate() {
    const letter = LETTERS[currentIndex];
    markPracticed(letter.id);
    celebrateOverlay.classList.remove("hidden");
    setTimeout(() => {
      celebrateOverlay.classList.add("hidden");
      clearDrawing();
      if (currentIndex < LETTERS.length - 1) {
        goTo(currentIndex + 1);
      }
    }, 1300);
  }

  // ---------- Wire up controls ----------
  btnHome.addEventListener("click", showHomeScreen);
  btnPrev.addEventListener("click", () => goTo(currentIndex - 1));
  btnNext.addEventListener("click", () => goTo(currentIndex + 1));
  btnClear.addEventListener("click", clearDrawing);
  btnDone.addEventListener("click", celebrate);
  btnSayLetter.addEventListener("click", () => speak(LETTERS[currentIndex].telugu, "te-IN"));
  btnSayWord.addEventListener("click", () => {
    const l = LETTERS[currentIndex];
    if (l.word) speak(l.word, "te-IN");
  });

  window.addEventListener("keydown", (e) => {
    if (practiceScreen.classList.contains("hidden")) return;
    if (e.key === "ArrowRight") goTo(currentIndex + 1);
    if (e.key === "ArrowLeft") goTo(currentIndex - 1);
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

  // ---------- Init ----------
  showHomeScreen();
})();
