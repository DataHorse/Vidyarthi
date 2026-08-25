"""
Tests the Trace/Practice accuracy-scoring recalibration: coverage is graded
against a CORE mask (the same glyph rendered at a much thinner font weight)
instead of the full bold (weight-900) guide glyph, because a real pen stroke
— even a careful, accurate one — can never fill a bold glyph's full
interior. Before this fix, a genuinely good hand-drawn letter could score
~60% (coverage capped by the bold glyph's thickness) even though it visually
looked like a much closer match. See app.js's CORE_WEIGHT comment.

This file specifically covers two things the rest of the suite doesn't:
  1. A properly-aligned, thinner-than-guide, slightly-imprecise "good real
     handwriting" proxy now scores well (the actual regression fixed here).
  2. The Trace-mode pass/retry gate resists a scribble that spans most of
     the drawing box — including for combos with wide ink extents (ై, ౄ)
     where a smaller coverage target gives a scribble more relative room —
     discovered during calibration and closed with PASS_MATCH_MIN.

Run with a server already serving the app root at http://localhost:8000:
    python3 -m http.server 8000 --directory /home/claude/vidyarthi &
    python3 tests/test_scoring_calibration.py
"""
import sys
from playwright.sync_api import sync_playwright

BASE = "http://localhost:8000/index.html"
FAILURES = []

# A representative spread: plain letters, thick/complex ones, thin marks
# (anusvara/visarga/vocalic), and గుణింతం combos — including the widest
# vowel signs (ై, ౄ) which turned out to need extra scribble-margin.
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
    page.wait_for_timeout(60)
    return ok


def clear(page):
    page.locator("#btn-clear").click()
    page.wait_for_timeout(40)


def percent(page):
    r = page.evaluate("window.__vidyarthiTest.scoreDrawing()")
    return round(r["coverage"] * r["precision"] * 100), r


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 430, "height": 932})
        page.goto(BASE)
        page.wait_for_timeout(300)
        page.locator(".lesson-card").first.click()
        page.wait_for_timeout(300)

        # ---------- The actual regression: genuinely good but imperfect
        # real handwriting now scores well, not capped around ~60% ----------
        for tel in SAMPLE_LETTERS:
            if not goto(page, tel):
                check(f"{tel} exists in LETTERS_BY_CHAR", False)
                continue

            clear(page)
            page.evaluate("window.__vidyarthiTest.paintPerfectFillForTest()")
            pct_perfect, _ = percent(page)
            check(f"{tel}: pixel-perfect fill scores very high (>=85)", pct_perfect >= 85, f"got {pct_perfect}")

            clear(page)
            page.evaluate("window.__vidyarthiTest.paintWeightedFillForTest(700, 0.008)")
            pct_good, r = percent(page)
            check(
                f"{tel}: a genuinely good, thinner/slightly-imprecise fill scores well (>=75, not stuck ~60)",
                pct_good >= 75,
                f"got {pct_good} ({r})",
            )

        # ---------- Scribble resistance holds even for wide-ink combos ----------
        for tel in SAMPLE_LETTERS:
            if not goto(page, tel):
                continue
            clear(page)
            page.evaluate(DENSE_FILL_SCRIBBLE)
            pct_scribble, r = percent(page)
            grade = page.evaluate("window.__vidyarthiTest.gradeAttempt()")
            check(
                f"{tel}: a scribble spanning most of the box scores low (<45)",
                pct_scribble < 45,
                f"got {pct_scribble} ({r})",
            )
            check(
                f"{tel}: that same scribble does not pass Trace mode",
                grade["verdict"] != "pass",
                f"got {grade}",
            )

        # ---------- Thin-mark glyphs still have a real, non-degenerate
        # coverage target (CORE_WEIGHT fallback for near-empty thin cores) ----------
        for tel in ["అం", "అః", "ఙ", "ఞ"]:
            goto(page, tel)
            clear(page)
            page.evaluate("window.__vidyarthiTest.paintPerfectFillForTest()")
            r = page.evaluate("window.__vidyarthiTest.scoreDrawing()")
            check(f"{tel}: coverage target has real pixels (maskCount > 50)", r["maskCount"] > 50, f"got {r}")

        # ---------- The renamed "Check it!" / "See my score!" button label ----------
        goto(page, "అ")
        label_trace = page.locator("#btn-done-label").inner_text().strip()
        check("Trace-mode button label is not the old 'I'm done!'", label_trace != "I'm done!", f"got {label_trace!r}")
        page.locator("#mode-practice").click()
        page.wait_for_timeout(150)
        label_practice = page.locator("#btn-done-label").inner_text().strip()
        check("Practice-mode button label differs from Trace mode's", label_practice != label_trace, f"got {label_practice!r} vs {label_trace!r}")

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
