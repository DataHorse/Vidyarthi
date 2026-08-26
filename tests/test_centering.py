"""
Tests that every letter's guide glyph (and, by construction, its scoring
masks — see below) is genuinely centered in the drawing box, with no part
clipped, on every viewport this app targets.

This directly covers a real bug report: on iPad, some letters rendered
visibly off-center (usually shifted right) with part of the glyph clipped
against the canvas edge. The old centering logic trusted
ctx.measureText()'s actualBoundingBox* metrics, which turned out to be
unreliable for Telugu conjuncts/vowel-sign combinations on WebKit — this
suite can't run on real iPad Safari from here, but it holds the *logic* to
a much tighter, per-letter, all-592-letter standard than the old spot-check
did, and computeGlyphLayout no longer depends on measureText() at all (it
reads back actual rendered pixels instead), which is what makes the fix
browser-independent rather than tuned to whichever browser happened to be
available to test against.

Critically, VIEWPORTS below includes device_scale_factor (devicePixelRatio)
values matching real iPad/iPhone hardware (2 and 3), not just Playwright's
default of 1. A first attempt at this fix replaced measureText() with a
pixel-probe that read back rendered pixels via ctx.getImageData() — correct
in principle, but it probed directly on the *live*, on-screen canvas
context, which setupCanvasSize() scales with ctx.setTransform(dpr, ...) so
CSS-pixel coordinates map correctly onto the physical backing store.
getImageData() always reads back *physical* pixels and completely ignores
that transform, so probing on the live context sampled the wrong region of
the backing store on any device where devicePixelRatio != 1 — invisible in
this whole suite when every test ran at the implicit default dpr=1 (where
CSS pixels and device pixels are numerically identical, masking the bug
completely), but severe on real hardware: reproducing it against the
previous commit at device_scale_factor=3 showed letters landing as far off
as cx=0.11/cy=0.07 (versus the correct 0.5/0.5) and clipping against the
canvas edge on nearly every sampled letter. computeGlyphLayout now probes
on a dedicated, never-transformed scratch canvas instead (see app.js), so
this suite running dpr=2/3 cases and passing is the actual regression
guard — dpr=1 alone would have passed on the broken version too.

Because the guide layer and the scoring masks (core/dilated) are built from
the very same computeGlyphLayout() call and cached together per letter (see
getMasks() in app.js), a genuinely centered guide also means a genuinely
centered scoring target — so this suite is also the regression test for
"a letter drawn at the center of the box scores low because the mask itself
was off-center".

Run with a server already serving the app root at http://localhost:8000:
    python3 -m http.server 8000 --directory /home/claude/vidyarthi &
    python3 tests/test_centering.py
"""
import sys
from playwright.sync_api import sync_playwright

BASE = "http://localhost:8000/index.html"
FAILURES = []

# A tight tolerance: the ink's center must land within this fraction of the
# box's true center on each axis. 0.06 is roughly 6% of the box size —
# nowhere near enough slack to read as "off to one side" the way the
# original bug reports described.
CENTER_TOLERANCE = 0.06

VIEWPORTS = [
    ("iPad-ish @1x", 834, 1194, 1),
    ("iPad-ish @2x (real iPad dpr)", 834, 1194, 2),
    ("iPhone-ish @1x", 390, 844, 1),
    ("iPhone-ish @3x (real iPhone Pro dpr)", 390, 844, 3),
]


def check(label, cond, extra=""):
    status = "PASS" if cond else "FAIL"
    print(f"[{status}] {label}" + (f" — {extra}" if extra and not cond else ""))
    if not cond:
        FAILURES.append(label)


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()

        for name, vw, vh, dpr in VIEWPORTS:
            ctx = browser.new_context(viewport={"width": vw, "height": vh}, device_scale_factor=dpr, has_touch=True)
            page = ctx.new_page()
            page.goto(BASE)
            page.wait_for_selector(".lesson-card")
            page.wait_for_timeout(300)
            page.locator(".lesson-card").first.click()
            page.wait_for_timeout(300)

            report = page.evaluate(
                """
                () => {
                  const results = [];
                  const c = document.getElementById('guide-canvas');
                  const ctx = c.getContext('2d');
                  for (const letter of LETTERS) {
                    const lesson = LESSONS.find(l => l.letters.some(x => x.id === letter.id));
                    window.__vidyarthiTest.gotoLetterForTest(lesson, letter);
                    const w = c.width, h = c.height;
                    const data = ctx.getImageData(0, 0, w, h).data;
                    let minX = w, maxX = -1, minY = h, maxY = -1;
                    for (let y = 0; y < h; y++) {
                      const row = y * w;
                      for (let x = 0; x < w; x++) {
                        if (data[(row + x) * 4 + 3] > 40) {
                          if (x < minX) minX = x;
                          if (x > maxX) maxX = x;
                          if (y < minY) minY = y;
                          if (y > maxY) maxY = y;
                        }
                      }
                    }
                    if (maxX < 0) { results.push({ telugu: letter.telugu, noInk: true }); continue; }
                    const cx = (minX + maxX) / 2 / w;
                    const cy = (minY + maxY) / 2 / h;
                    const touchesEdge = minX <= 0 || maxX >= w - 1 || minY <= 0 || maxY >= h - 1;
                    results.push({ telugu: letter.telugu, cx, cy, touchesEdge });
                  }
                  return results;
                }
                """
            )

            no_ink = [r["telugu"] for r in report if r.get("noInk")]
            check(f"[{name}] every letter's guide renders some ink", len(no_ink) == 0, f"no ink for: {no_ink[:10]}")

            off_center_x = [r for r in report if not r.get("noInk") and abs(r["cx"] - 0.5) > CENTER_TOLERANCE]
            off_center_y = [r for r in report if not r.get("noInk") and abs(r["cy"] - 0.5) > CENTER_TOLERANCE]
            clipped = [r for r in report if not r.get("noInk") and r["touchesEdge"]]

            check(
                f"[{name}] all 592 letters horizontally centered (within {CENTER_TOLERANCE:.0%})",
                len(off_center_x) == 0,
                f"{len(off_center_x)} off-center: " + ", ".join(f"{r['telugu']}(cx={r['cx']:.3f})" for r in off_center_x[:8]),
            )
            check(
                f"[{name}] all 592 letters vertically centered (within {CENTER_TOLERANCE:.0%})",
                len(off_center_y) == 0,
                f"{len(off_center_y)} off-center: " + ", ".join(f"{r['telugu']}(cy={r['cy']:.3f})" for r in off_center_y[:8]),
            )
            check(
                f"[{name}] no letter's guide ink touches the canvas edge",
                len(clipped) == 0,
                f"{len(clipped)} clipped: " + ", ".join(r["telugu"] for r in clipped[:8]),
            )

            if not off_center_x and not off_center_y and not clipped:
                worst_x = max(report, key=lambda r: abs(r.get("cx", 0.5) - 0.5))
                worst_y = max(report, key=lambda r: abs(r.get("cy", 0.5) - 0.5))
                print(f"    worst horizontal drift at {name}: {worst_x['telugu']} (cx={worst_x['cx']:.4f})")
                print(f"    worst vertical drift at {name}: {worst_y['telugu']} (cy={worst_y['cy']:.4f})")

            ctx.close()

        # ---------- The actual complaint scenario (bug report #2): a
        # letter drawn smaller than the printed guide, at the box's center
        # or shifted toward the left, still scores well — for a broad
        # sample including the widest/shortest glyphs (ౠ, ఘూ, ఝౄ, మౄ) that
        # used to be worst-affected both by the measureText-based
        # centering bug and by an unrelated bounding-box-normalization gap
        # for extreme-aspect-ratio glyphs (see NORMALIZE_MIN_EXTENT_MASK_RATIO
        # in app.js). Uses paintScaledFillForTest — real ink positioned in
        # real box-fraction coordinates, not a font-metrics guess — so this
        # is a fair, engine-independent proxy for "a child drew a
        # reasonably-sized copy, roughly centered or a bit to the left,
        # by eye". ----------
        ctx = browser.new_context(viewport={"width": 834, "height": 1194}, has_touch=True)
        page = ctx.new_page()
        page.goto(BASE)
        page.wait_for_selector(".lesson-card")
        page.wait_for_timeout(300)
        page.locator(".lesson-card").first.click()
        page.wait_for_timeout(300)

        sample = ["అ", "క", "ధ", "ఘ", "మ", "ళ", "క్ష", "ఱ", "ౠ", "ఘూ", "ఝౄ", "మౄ", "బృ", "గా", "కం", "నీ"]

        def goto(tel):
            page.evaluate(
                f"""
                (() => {{
                  const letter = LETTERS_BY_CHAR.get({tel!r});
                  const lesson = LESSONS.find(l => l.letters.some(x => x.id === letter.id));
                  window.__vidyarthiTest.gotoLetterForTest(lesson, letter);
                }})()
                """
            )
            page.wait_for_timeout(40)

        def score():
            r = page.evaluate("window.__vidyarthiTest.scoreDrawing()")
            return round(r["coverage"] * r["precision"] * 100), r

        for tel in sample:
            goto(tel)

            # Smaller than natural size, dead-center of the box.
            page.locator("#btn-clear").click()
            page.wait_for_timeout(30)
            page.evaluate("window.__vidyarthiTest.paintScaledFillForTest(0.65, 0, 0)")
            pct, r = score()
            check(f"{tel} drawn smaller and centered scores well (>=70)", pct >= 70, f"got {pct} ({r})")

            # Smaller than natural size, shifted toward the left (the
            # bug report's specific "center or toward the left" phrasing).
            page.locator("#btn-clear").click()
            page.wait_for_timeout(30)
            page.evaluate("window.__vidyarthiTest.paintScaledFillForTest(0.65, -0.09, 0)")
            pct, r = score()
            check(f"{tel} drawn smaller and shifted left still scores well (>=65)", pct >= 65, f"got {pct} ({r})")

            # Natural size, dead-center — should be close to a perfect
            # match (>=80 — downsampling antialiasing on the densest
            # conjuncts keeps even an exact reproduction shy of 100%,
            # same as the pixel-perfect-fill checks elsewhere in the suite).
            page.locator("#btn-clear").click()
            page.wait_for_timeout(30)
            page.evaluate("window.__vidyarthiTest.paintScaledFillForTest(1.0, 0, 0)")
            pct, r = score()
            check(f"{tel} drawn at natural size, centered, scores very high (>=80)", pct >= 80, f"got {pct} ({r})")

        ctx.close()
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
