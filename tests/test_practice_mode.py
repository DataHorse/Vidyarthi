"""
Tests the "Practice" mode: a blank (no outline) drawing box with a
percentage match score, separate from Trace mode's pass/retry flow.

Run with a server already serving the app root at http://localhost:8000:
    python3 -m http.server 8000 --directory /home/claude/vidyarthi &
    python3 tests/test_practice_mode.py
"""
import sys
from playwright.sync_api import sync_playwright

BASE = "http://localhost:8000/index.html"
FAILURES = []


def check(label, cond, extra=""):
    status = "PASS" if cond else "FAIL"
    print(f"[{status}] {label}" + (f" — {extra}" if extra and not cond else ""))
    if not cond:
        FAILURES.append(label)


def paint_perfect_fill(page):
    """Draws a pixel-accurate copy of the current letter, using the app's own
    layout math (same size + anchor the scoring mask itself uses) — the best
    possible score, simulating a child who has memorized the letter well."""
    page.evaluate("window.__vidyarthiTest.paintPerfectFillForTest()")


def scribble_edges(page):
    """A substantial scribble that avoids the letter's shape (hugs the box's
    edges/corners) — enough ink to count as a real attempt, but nowhere near
    the glyph, so it should score low rather than count as 'no attempt'."""
    page.evaluate(
        """
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
    )


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 430, "height": 932})
        page.goto(BASE)
        page.wait_for_timeout(300)

        # ---------- New cluster grouping for "Other letters" ----------
        clusters_ok = page.evaluate(
            """
            (() => {
              const byChar = new Map(LETTERS.map(l => [l.telugu, l]));
              const sameCluster = (arr) => {
                const c = byChar.get(arr[0]).cluster;
                return arr.every(ch => byChar.get(ch).cluster === c);
              };
              const g1 = sameCluster(["య","ర","ల","వ"]);
              const g2 = sameCluster(["శ","ష","స","హ"]);
              const g3 = sameCluster(["ళ","క్ష","ఱ"]);
              const distinct = new Set([
                byChar.get("య").cluster, byChar.get("శ").cluster, byChar.get("ళ").cluster
              ]).size === 3;
              return g1 && g2 && g3 && distinct;
            })()
            """
        )
        check("(య,ర,ల,వ) (శ,ష,స,హ) (ళ,క్ష,ఱ) are three distinct clusters", clusters_ok)

        lesson10 = page.evaluate("LESSONS[9].letters.map(l => l.telugu)")
        lesson11 = page.evaluate("LESSONS[10].letters.map(l => l.telugu)")
        lesson12 = page.evaluate("LESSONS[11].letters.map(l => l.telugu)")
        check("Lesson 10 = య,ర,ల,వ", lesson10 == ["య", "ర", "ల", "వ"], f"got {lesson10}")
        check("Lesson 11 = శ,ష,స,హ", lesson11 == ["శ", "ష", "స", "హ"], f"got {lesson11}")
        check("Lesson 12 = ళ,క్ష,ఱ", lesson12 == ["ళ", "క్ష", "ఱ"], f"got {lesson12}")
        check("12 Chapter 1 lessons", page.evaluate("LESSONS.filter(l => l.chapter === 1).length") == 12)
        check("48 lessons total (12 Chapter 1 + 36 Chapter 2)", page.evaluate("LESSONS.length") == 48)

        # ---------- Enter Lesson 1, default is Trace mode ----------
        page.locator(".lesson-card").first.click()
        page.wait_for_timeout(400)
        check("starts in Trace mode", page.evaluate("window.__vidyarthiTest.isPracticeMode()") is False)
        check("#mode-trace has active class", "active" in page.locator("#mode-trace").get_attribute("class"))
        guide_ink_trace = page.evaluate("window.__vidyarthiTest.getGuideInkCount()")
        check("guide canvas has dashed-outline ink in Trace mode", guide_ink_trace > 0, f"got {guide_ink_trace}")

        # ---------- Switch to Practice mode: guide canvas goes blank ----------
        page.locator("#mode-practice").click()
        page.wait_for_timeout(200)
        check("switches to Practice mode", page.evaluate("window.__vidyarthiTest.isPracticeMode()") is True)
        check("#mode-practice has active class", "active" in page.locator("#mode-practice").get_attribute("class"))
        guide_ink_practice = page.evaluate("window.__vidyarthiTest.getGuideInkCount()")
        check("guide canvas is blank (no outline) in Practice mode", guide_ink_practice == 0, f"got {guide_ink_practice}")
        check("canvas-wrap gets practice-mode class", "practice-mode" in page.locator(".canvas-wrap").get_attribute("class"))

        # ---------- Empty submission in Practice mode: no crash, no score stored ----------
        page.locator("#btn-done").click()
        page.wait_for_timeout(1500)
        best_after_empty = page.evaluate("window.__vidyarthiTest.getPracticeBest()")
        check("no practice score recorded for an empty attempt", "0" not in best_after_empty and len(best_after_empty) == 0, f"got {best_after_empty}")

        # ---------- A poor scribble scores low but doesn't crash / doesn't advance ----------
        scribble_edges(page)
        page.locator("#btn-done").click()
        page.wait_for_timeout(2000)
        letter_after_scribble = page.evaluate("document.getElementById('big-letter-preview').textContent")
        check("stays on the same letter after a low-score practice attempt", letter_after_scribble.strip() == "అ", f"got {letter_after_scribble!r}")
        best_after_scribble = page.evaluate("window.__vidyarthiTest.getPracticeBest()")
        letter0_id = str(page.evaluate("LESSONS[0].letters[0].id"))
        check("a low score was still recorded", letter0_id in best_after_scribble, f"got {best_after_scribble}")
        low_score = best_after_scribble.get(letter0_id, -1)
        check("scribble score is low (<50)", 0 <= low_score < 50, f"got {low_score}")

        # ---------- An accurate freehand copy scores high, updates best, shows badge ----------
        paint_perfect_fill(page)
        page.locator("#btn-done").click()
        page.wait_for_timeout(2200)
        best_after_good = page.evaluate("window.__vidyarthiTest.getPracticeBest()")
        high_score = best_after_good.get(letter0_id, -1)
        check("accurate freehand copy scores high (>=70)", high_score >= 70, f"got {high_score}")
        check("still on the same letter (practice never auto-advances)", page.locator("#big-letter-preview").inner_text().strip() == "అ")

        badge_text = page.locator("#practice-best").inner_text()
        check("best-score badge shows the improved score", str(high_score) in badge_text, f"got {badge_text!r}")

        # ---------- Scoring is legibility-based, not print-exact: a smaller/
        # off-center/differently-proportioned but still-correct freehand copy
        # should score well, and a dense scribble should not sneak past by
        # merely covering a lot of the box. ----------
        def percent(page):
            r = page.evaluate("window.__vidyarthiTest.scoreDrawing()")
            return page.evaluate(
                "(r) => (r.drawCount < 45 ? 0 : Math.round(r.coverage * r.precision * 100))", r
            )

        def clear_ink(page):
            page.locator("#btn-clear").click()
            page.wait_for_timeout(80)

        clear_ink(page)
        page.evaluate("window.__vidyarthiTest.paintScaledFillForTest(0.5, 0.15, 0.15)")
        small_offset_score = percent(page)
        check(
            "a half-size, corner-offset but accurate copy still scores high (>=70)",
            small_offset_score >= 70,
            f"got {small_offset_score}",
        )

        clear_ink(page)
        page.evaluate("window.__vidyarthiTest.paintDistortedFillForTest(0.6, 1.0, 0, 0)")
        narrow_score = percent(page)
        check(
            "a narrower-than-print (0.6x width) but accurate copy still scores high (>=80)",
            narrow_score >= 80,
            f"got {narrow_score}",
        )

        clear_ink(page)
        page.evaluate(
            """
            (() => {
              const ctx = window.__vidyarthiTest.getDrawCtx();
              const rect = window.__vidyarthiTest.getGuideRect();
              const w = rect.width, h = rect.height;
              ctx.strokeStyle = '#000';
              ctx.lineWidth = Math.max(8, w * 0.04);
              ctx.beginPath();
              ctx.moveTo(w * 0.5, h * 0.1);
              const pts = [[0.9,0.2],[0.1,0.35],[0.85,0.5],[0.15,0.65],[0.9,0.8],[0.1,0.9]];
              for (const [px, py] of pts) ctx.lineTo(w * px, h * py);
              ctx.stroke();
              window.__vidyarthiTest.markHasInk();
            })()
            """
        )
        dense_scribble_score = percent(page)
        check(
            "a dense zig-zag scribble spanning the box still scores low (<45)",
            dense_scribble_score < 45,
            f"got {dense_scribble_score}",
        )
        clear_ink(page)

        # ---------- Practice-mode scores never touch Trace-mode progress ----------
        trace_progress = page.evaluate("JSON.parse(localStorage.getItem('vidyarthi-progress-v1') || '{}')")
        check("practice attempts do not mark the letter as traced/practiced", letter0_id not in trace_progress, f"got {trace_progress}")

        # ---------- Switching back to Trace mode restores the dashed guide ----------
        page.locator("#mode-trace").click()
        page.wait_for_timeout(200)
        guide_ink_back = page.evaluate("window.__vidyarthiTest.getGuideInkCount()")
        check("switching back to Trace restores the dashed guide", guide_ink_back > 0, f"got {guide_ink_back}")

        # ---------- A good trace switches straight into Practice mode on the
        # *same* letter (instead of advancing) ----------
        page.evaluate("window.__vidyarthiTest.paintPerfectFillForTest()")
        page.locator("#btn-done").click()
        page.wait_for_timeout(1900)
        check(
            "a passing trace stays on the same letter",
            page.locator("#big-letter-preview").inner_text().strip() == "అ",
        )
        check(
            "a passing trace switches into Practice mode",
            page.evaluate("window.__vidyarthiTest.isPracticeMode()") is True,
        )

        # ---------- Moving to the next letter (Next ▶) always lands back in
        # Trace mode, since the next letter hasn't been traced yet ----------
        page.locator("#btn-next").click()
        page.wait_for_timeout(200)
        check(
            "Next resets to Trace mode for the next letter",
            page.evaluate("window.__vidyarthiTest.isPracticeMode()") is False,
        )
        page.locator("#btn-prev").click()
        page.wait_for_timeout(200)
        check(
            "Previous also resets to Trace mode",
            page.evaluate("window.__vidyarthiTest.isPracticeMode()") is False,
        )

        # ---------- Navigating to a fresh lesson resets to Trace mode ----------
        page.locator("#mode-practice").click()
        page.wait_for_timeout(150)
        page.locator("#btn-home").click()
        page.wait_for_timeout(300)
        page.locator(".lesson-card").nth(1).click()
        page.wait_for_timeout(400)
        check("entering a new lesson resets to Trace mode", page.evaluate("window.__vidyarthiTest.isPracticeMode()") is False)

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
