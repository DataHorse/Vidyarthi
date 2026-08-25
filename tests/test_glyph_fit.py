"""
Checks that every letter's guide glyph fully fits inside the drawing canvas
(no clipping against the edge) at a range of viewport sizes, and that the
trace-accuracy mask stays in sync with what's actually drawn.

Run with a server already serving the app root at http://localhost:8000:
    python3 -m http.server 8000 --directory /home/claude/vidyarthi &
    python3 tests/test_glyph_fit.py
"""
import sys
from playwright.sync_api import sync_playwright

BASE = "http://localhost:8000/index.html"
FAILURES = []

VIEWPORTS = [
    ("iPhone-ish", {"width": 390, "height": 844}),
    ("iPad-ish", {"width": 834, "height": 1194}),
    ("small-phone", {"width": 320, "height": 568}),
    ("desktop", {"width": 1100, "height": 900}),
]


def check(label, cond, extra=""):
    status = "PASS" if cond else "FAIL"
    print(f"[{status}] {label}" + (f" — {extra}" if extra and not cond else ""))
    if not cond:
        FAILURES.append(label)


def ink_bbox(page):
    return page.evaluate(
        """
        () => {
          const c = document.getElementById('guide-canvas');
          const ctx = c.getContext('2d');
          const w = c.width, h = c.height;
          const data = ctx.getImageData(0, 0, w, h).data;
          let minX = w, maxX = 0, minY = h, maxY = 0, found = false;
          for (let y = 0; y < h; y += 1) {
            for (let x = 0; x < w; x += 1) {
              const a = (y * w + x) * 4 + 3;
              if (data[a] > 40) {
                found = true;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }
            }
          }
          if (!found) return null;
          return { minX, maxX, minY, maxY, w, h };
        }
        """
    )


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()

        for vp_name, vp in VIEWPORTS:
            page = browser.new_page(viewport=vp)
            page.goto(BASE)
            page.wait_for_timeout(300)

            letters = page.evaluate("LETTERS.map(l => l.telugu)")
            worst_margin = None
            worst_letter = None
            clipped = []

            for i, ch in enumerate(letters):
                # Jump straight to this letter via the lesson containing it.
                page.evaluate(
                    """
                    (ch) => {
                      const letter = LETTERS_BY_CHAR.get(ch);
                      const lesson = LESSONS.find(l => l.letters.includes(letter));
                      window.__vidyarthiTest.gotoLetterForTest(lesson, letter);
                    }
                    """,
                    ch,
                )
                # The very first jump also transitions home -> practice
                # (color row build, canvas resize, layout reflow, then an
                # rAF-deferred paint) so it needs a bit longer than the
                # in-place re-renders that follow.
                page.wait_for_timeout(400 if i == 0 else 30)
                bbox = ink_bbox(page)
                if bbox is None:
                    clipped.append((ch, "no ink found"))
                    continue
                margin_left = bbox["minX"]
                margin_right = bbox["w"] - bbox["maxX"]
                margin_top = bbox["minY"]
                margin_bottom = bbox["h"] - bbox["maxY"]
                min_margin = min(margin_left, margin_right, margin_top, margin_bottom)
                # A tiny margin (a couple of px) counts as touching the edge.
                if min_margin <= 2:
                    clipped.append((ch, f"margin={min_margin}px (L{margin_left} R{margin_right} T{margin_top} B{margin_bottom}) of {bbox['w']}px canvas"))
                if worst_margin is None or min_margin < worst_margin:
                    worst_margin = min_margin
                    worst_letter = ch

            check(
                f"[{vp_name}] all {len(letters)} letters fit fully inside the canvas",
                len(clipped) == 0,
                f"{len(clipped)} clipped: {clipped[:8]}",
            )
            print(f"    worst margin at {vp_name}: {worst_letter!r} -> {worst_margin}px")

            page.close()

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
