"""
Tests the shape/pattern-recognition scoring dimension: this directly covers
a real bug report — "if the user just scribbles and fills some random lines
in the place the traceable character appears, the percentage match shows
very high ... actual character pattern recognition is not being done".

Before this fix, coverage/precision only measured *area overlap* with the
letter's shape, not whether the ink was actually *patterned* like the
letter (dense where the letter has strokes, sparse in its gaps/counters).
A scribble that densely criss-crosses the whole drawing box overlaps a
large fraction of nearly any letter's shape almost by accident, since it
has ink almost everywhere — see the "dense fill"/"zig-zag" scribble tests
in test_scoring_calibration.py and test_practice_mode.py, which already
covered the *coverage/precision* side of scribble-resistance. This file
covers the shape/pattern side specifically: the app now builds an 8x8
ink-density signature for both the child's drawing and the letter's own
core stroke path, and grades how well the two *patterns* correlate (a
classical OCR "zoning" technique) — not just how much area overlaps. See
the SHAPE_* constants and comments in app.js (scoreDrawing/percentScore).

The guiding heuristic requested in the bug report — "if I, as a human,
could recognize the drawing as the letter, it should score well; if I
couldn't, it shouldn't" — is what these checks are proxying for: every
"real attempt" simulation (a filled copy, a thinner/weighted copy, a
distorted copy, even a bare stroked outline) should read as recognizably
the letter, while every scribble/fill simulation below is deliberately
*not* shaped like any letter (uniform lines, a solid block, an outline
that hugs the box edges) and should not.

Run with a server already serving the app root at http://localhost:8000:
    python3 -m http.server 8000 --directory /home/claude/vidyarthi &
    python3 tests/test_shape_recognition.py
"""
import sys
from playwright.sync_api import sync_playwright

BASE = "http://localhost:8000/index.html"
FAILURES = []

# A representative spread, including the widest/shortest glyphs that stress
# the zone grid the most (very little vertical variation to correlate).
SAMPLE_LETTERS = [
    "అ", "క", "మ", "ధ", "బ", "శ", "క్ష", "ఱ", "ఙ", "ఞ", "అం", "అః", "ౠ",
    "కం", "గా", "నీ", "ము", "వి", "తా", "ఖై", "గౄ", "చై", "రౄ", "ళై",
]

DENSE_FILL_SCRIBBLE = """
(() => {
  const ctx = window.__vidyarthiTest.getDrawCtx();
  const rect = window.__vidyarthiTest.getGuideRect();
  const w = rect.width, h = rect.height;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = Math.max(8, w * 0.05);
  ctx.beginPath();
  let y = 0.08;
  ctx.moveTo(w*0.08, h*y);
  for (let i=0;i<9;i++){
    y += 0.09;
    ctx.lineTo(w*0.92, h*y);
    y += 0.09;
    ctx.lineTo(w*0.08, h*y);
  }
  ctx.stroke();
  window.__vidyarthiTest.markHasInk();
})()
"""

ZIGZAG_SCRIBBLE = """
(() => {
  const ctx = window.__vidyarthiTest.getDrawCtx();
  const rect = window.__vidyarthiTest.getGuideRect();
  const w = rect.width, h = rect.height;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = Math.max(6, w * 0.03);
  ctx.beginPath();
  let x = 0.1;
  ctx.moveTo(w*x, h*0.1);
  for (let i=0;i<14;i++){
    x += (i%2===0) ? 0.6 : -0.6;
    x = Math.max(0.1, Math.min(0.9, x));
    ctx.lineTo(w*x, h*(0.1 + (i+1)*0.055));
  }
  ctx.stroke();
  window.__vidyarthiTest.markHasInk();
})()
"""

SOLID_FILL_SCRIBBLE = """
(() => {
  const ctx = window.__vidyarthiTest.getDrawCtx();
  const rect = window.__vidyarthiTest.getGuideRect();
  ctx.fillStyle = '#000';
  ctx.fillRect(rect.width*0.1, rect.height*0.1, rect.width*0.8, rect.height*0.8);
  window.__vidyarthiTest.markHasInk();
})()
"""

EDGE_HUGGING_SCRIBBLE = """
(() => {
  const ctx = window.__vidyarthiTest.getDrawCtx();
  const rect = window.__vidyarthiTest.getGuideRect();
  const w = rect.width, h = rect.height;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = Math.max(8, w * 0.03);
  ctx.beginPath();
  ctx.moveTo(w * 0.03, h * 0.03);
  ctx.lineTo(w * 0.25, h * 0.03);
  ctx.lineTo(w * 0.03, h * 0.25);
  ctx.lineTo(w * 0.97, h * 0.03);
  ctx.lineTo(w * 0.97, h * 0.2);
  ctx.lineTo(w * 0.8, h * 0.03);
  ctx.stroke();
  window.__vidyarthiTest.markHasInk();
})()
"""

SCRIBBLES = {
    "a dense criss-cross fill spanning the box": DENSE_FILL_SCRIBBLE,
    "a dense zig-zag spanning the box": ZIGZAG_SCRIBBLE,
    "a plain solid block filling the letter's area": SOLID_FILL_SCRIBBLE,
    "a scribble hugging the box's edges/corners": EDGE_HUGGING_SCRIBBLE,
}


def check(label, cond, extra=""):
    status = "PASS" if cond else "FAIL"
    print(f"[{status}] {label}" + (f" — {extra}" if extra and not cond else ""))
    if not cond:
        FAILURES.append(label)


def goto(page, tel):
    ok = page.evaluate(
        f"""
        (() => {{
          const letter = LETTERS_BY_CHAR.get({tel!r});
          if (!letter) return false;
          const lesson = LESSONS.find(l => l.letters.some(x => x.id === letter.id));
          window.__vidyarthiTest.gotoLetterForTest(lesson, letter);
          return true;
        }})()
        """
    )
    page.wait_for_timeout(40)
    return ok


def clear(page):
    page.locator("#btn-clear").click()
    page.wait_for_timeout(30)


def score_and_result(page):
    r = page.evaluate("window.__vidyarthiTest.scoreDrawing()")
    pct = round(r["coverage"] * r["precision"] * (0.55 + 0.45 * (r.get("shape") or 0)) * 100)
    return pct, r


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 430, "height": 932})
        page.goto(BASE)
        page.wait_for_timeout(300)
        page.locator(".lesson-card").first.click()
        page.wait_for_timeout(300)

        # ---------- Real attempts (however imprecise) score a genuinely
        # high shape match, and clear the pass gate ----------
        for tel in SAMPLE_LETTERS:
            if not goto(page, tel):
                check(f"{tel} exists in LETTERS_BY_CHAR", False)
                continue

            clear(page)
            page.evaluate("window.__vidyarthiTest.paintPerfectFillForTest()")
            _, r = score_and_result(page)
            check(f"{tel}: pixel-perfect fill has a strong shape match (>=0.9)", r["shape"] >= 0.9, f"got {r}")

            clear(page)
            page.evaluate("window.__vidyarthiTest.paintWeightedFillForTest(600, 0.02)")
            _, r = score_and_result(page)
            check(f"{tel}: a genuinely good, slightly-imprecise fill has a strong shape match (>=0.85)", r["shape"] >= 0.85, f"got {r}")

            # A bare stroked outline (not filled) is the least letter-shaped
            # a real, careful trace ever looks — still recognizable.
            clear(page)
            page.evaluate("window.__vidyarthiTest.paintRealisticStrokeForTest(0.01)")
            _, r = score_and_result(page)
            check(f"{tel}: a realistic stroked-outline trace still has a real shape match (>=0.75)", r["shape"] >= 0.75, f"got {r}")

        # ---------- Scribbles that fill the letter's silhouette score a
        # low shape match, and correctly fail to pass ----------
        for tel in SAMPLE_LETTERS:
            if not goto(page, tel):
                continue
            for label, script in SCRIBBLES.items():
                clear(page)
                page.evaluate(script)
                pct, r = score_and_result(page)
                grade = page.evaluate("window.__vidyarthiTest.gradeAttempt()")
                check(
                    f"{tel}: {label} has a low shape match (<0.78)",
                    r["shape"] < 0.78,
                    f"got {r}",
                )
                check(
                    f"{tel}: {label} does not pass Trace mode (shape gate)",
                    grade["verdict"] != "pass",
                    f"got {grade}",
                )

        browser.close()

    print()
    if FAILURES:
        print(f"{len(FAILURES)} FAILURE(S):")
        for f in FAILURES:
            print("  -", f)
        sys.exit(1)
    print("All checks passed.")


if __name__ == "__main__":
    main()
