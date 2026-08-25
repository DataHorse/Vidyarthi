"""
Playwright tests for the Lessons feature, trace-accuracy scoring, letter
data changes (roo/reorder/clustering), and TTS voice-selection wiring.

Run with a server already serving the app root at http://localhost:8000, e.g.:
    python3 -m http.server 8000 --directory /home/claude/vidyarthi &
    python3 tests/test_lessons.py
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


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 430, "height": 932})  # iPhone-ish
        page.goto(BASE)
        page.wait_for_timeout(300)

        # ---------- Letter data: count, roo insertion, reordering ----------
        # 52 hand-authored alphabet letters + 36 consonants x 15 vowel-sign
        # combinations (గుణింతం) = 592 total.
        letters = page.evaluate("LETTERS.map(l => l.telugu)")
        check("total letter count is 592 (52 alphabet + 36x15 గుణింతం)", len(letters) == 592, f"got {len(letters)}")
        check("ఋ immediately followed by ౠ", letters[letters.index("ఋ") + 1] == "ౠ")

        other_seq = page.evaluate(
            "LETTERS.filter(l => l.group === 'Other letters').map(l => l.telugu)"
        )
        expected_other = ["య", "ర", "ల", "వ", "శ", "ష", "స", "హ", "ళ", "క్ష", "ఱ"]
        check("Other letters sequence matches request", other_seq == expected_other, f"got {other_seq}")

        # ---------- Cluster field sanity ----------
        clusters_ok = page.evaluate(
            """
            (() => {
              const pairs = [["అ","ఆ"],["ఇ","ఈ"],["ఉ","ఊ"],["ఋ","ౠ"]];
              const triples = [["ఎ","ఏ","ఐ"],["ఒ","ఓ","ఔ"]];
              const byChar = new Map(LETTERS.map(l => [l.telugu, l]));
              const sameCluster = (arr) => {
                const c = byChar.get(arr[0]).cluster;
                return arr.every(ch => byChar.get(ch).cluster === c);
              };
              return pairs.every(sameCluster) && triples.every(sameCluster) &&
                     byChar.get("అం").cluster === byChar.get("అః").cluster;
            })()
            """
        )
        check("vowel pairs/triples share a cluster id", clusters_ok)

        # ---------- Example words present for previously-blank letters ----------
        rra_word = page.evaluate("LETTERS.find(l => l.telugu === 'ఱ').word")
        jha_word = page.evaluate("LETTERS.find(l => l.telugu === 'ఝ').word")
        na_retroflex_word = page.evaluate("LETTERS.find(l => l.telugu === 'ణ').word")
        la_retroflex_word = page.evaluate("LETTERS.find(l => l.telugu === 'ళ').word")
        check("ఱ has a non-empty example word", bool(rra_word), f"got {rra_word!r}")
        check("ఝ has a non-empty example word", bool(jha_word), f"got {jha_word!r}")
        check("ణ has a non-empty example word", bool(na_retroflex_word), f"got {na_retroflex_word!r}")
        check("ళ has a non-empty example word", bool(la_retroflex_word), f"got {la_retroflex_word!r}")

        # ---------- Lessons list on home screen ----------
        # Chapter 1 (the alphabet): 12 lessons. Chapter 2 (గుణింతం): one
        # lesson per consonant x 36 = 36 lessons. 48 total.
        chapter1_count = page.evaluate("LESSONS.filter(l => l.chapter === 1).length")
        chapter2_count = page.evaluate("LESSONS.filter(l => l.chapter === 2).length")
        lesson_count = page.evaluate("LESSONS.length")
        check("12 Chapter 1 lessons defined", chapter1_count == 12, f"got {chapter1_count}")
        check("36 Chapter 2 lessons defined", chapter2_count == 36, f"got {chapter2_count}")
        check("48 lessons total", lesson_count == 48, f"got {lesson_count}")
        cards = page.locator(".lesson-card")
        check("48 lesson cards rendered", cards.count() == 48, f"got {cards.count()}")
        check("2 chapter headers rendered", page.locator(".chapter-header").count() == 2)

        lesson1_chars = page.evaluate("LESSONS[0].letters.map(l => l.telugu)")
        check("Lesson 1 = అ,ఆ,ఇ,ఈ", lesson1_chars == ["అ", "ఆ", "ఇ", "ఈ"], f"got {lesson1_chars}")

        # ---------- Enter Lesson 1, verify practice screen scoping ----------
        cards.first.click()
        page.wait_for_timeout(400)
        progress_text = page.locator("#progress-pill").inner_text()
        check("progress pill shows 1 / 4 for Lesson 1", progress_text.strip() == "1 / 4", f"got {progress_text!r}")
        group_text = page.locator("#group-pill").inner_text()
        check("group pill shows Lesson 1", group_text.strip() == "Lesson 1", f"got {group_text!r}")
        big_letter = page.locator("#big-letter-preview").inner_text()
        check("first letter shown is అ", big_letter.strip() == "అ", f"got {big_letter!r}")

        # next/prev should stay within the 4-letter lesson only
        page.locator("#btn-next").click()
        page.locator("#btn-next").click()
        page.locator("#btn-next").click()
        page.wait_for_timeout(150)
        next_disabled = page.evaluate("document.getElementById('btn-next').disabled")
        check("next arrow disabled at last letter of lesson", next_disabled)
        last_letter = page.locator("#big-letter-preview").inner_text()
        check("4th letter of lesson is ఈ", last_letter.strip() == "ఈ", f"got {last_letter!r}")

        # back to first letter for scoring tests
        page.evaluate("document.getElementById('btn-prev').click()")
        page.evaluate("document.getElementById('btn-prev').click()")
        page.evaluate("document.getElementById('btn-prev').click()")
        page.wait_for_timeout(150)

        # ---------- Trace-accuracy scoring: empty canvas -> retry, no advance ----------
        page.locator("#btn-done").click()
        page.wait_for_timeout(1400)
        idx_after_empty = page.evaluate("document.getElementById('big-letter-preview').textContent")
        check("empty submission keeps same letter (no false success)", idx_after_empty.strip() == "అ")
        overlay_hidden = page.evaluate("document.getElementById('celebrate-overlay').classList.contains('hidden')")
        check("celebrate overlay hides itself again after empty-retry message", overlay_hidden)

        # ---------- Trace-accuracy scoring: scribble far outside letter -> retry ----------
        page.evaluate(
            """
            (() => {
              const ctx = window.__vidyarthiTest.getDrawCtx();
              const rect = window.__vidyarthiTest.getGuideRect();
              ctx.strokeStyle = '#000';
              ctx.lineWidth = 6;
              ctx.beginPath();
              ctx.moveTo(rect.width * 0.02, rect.height * 0.02);
              ctx.lineTo(rect.width * 0.08, rect.height * 0.03);
              ctx.stroke();
              window.__vidyarthiTest.markHasInk();
            })()
            """
        )
        scribble_grade = page.evaluate("window.__vidyarthiTest.gradeAttempt()")
        check(
            "tiny corner scribble does not pass",
            scribble_grade["verdict"] != "pass",
            f"got {scribble_grade}",
        )

        page.locator("#btn-clear").click()

        # ---------- Trace-accuracy scoring: tracing the actual glyph -> pass ----------
        page.evaluate(
            """
            (() => {
              const letter = window.__vidyarthiTest.getCurrentLetter();
              const ctx = window.__vidyarthiTest.getDrawCtx();
              const rect = window.__vidyarthiTest.getGuideRect();
              const size = rect.width * 0.68;
              ctx.font = `900 ${size}px "Noto Sans Telugu", sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = '#000';
              ctx.fillText(letter.telugu, rect.width / 2, rect.height / 2 + rect.height * 0.03);
              window.__vidyarthiTest.markHasInk();
            })()
            """
        )
        good_grade = page.evaluate("window.__vidyarthiTest.gradeAttempt()")
        check("filling in the actual glyph passes", good_grade["verdict"] == "pass", f"got {good_grade}")

        # Now actually click Done and confirm it marks practiced and moves
        # straight into Practice mode on the *same* letter, instead of
        # advancing to the next one — kids are meant to try the letter from
        # memory right after a good trace, not move on immediately.
        page.locator("#btn-done").click()
        page.wait_for_timeout(1800)
        same_letter = page.evaluate("document.getElementById('big-letter-preview').textContent")
        check("successful trace stays on the same letter (అ)", same_letter.strip() == "అ", f"got {same_letter!r}")
        check(
            "successful trace switches into Practice mode",
            page.evaluate("window.__vidyarthiTest.isPracticeMode()") is True,
            "expected Practice mode after a passing trace",
        )

        letter0_id = page.evaluate("LESSONS[0].letters[0].id")
        practiced = page.evaluate(f"JSON.parse(localStorage.getItem('vidyarthi-progress-v1'))['{letter0_id}']")
        check("letter is marked practiced in localStorage", practiced is True, f"got {practiced}")

        # ---------- Back to lessons shows updated star count on the card ----------
        page.locator("#btn-home").click()
        page.wait_for_timeout(300)
        lesson1_stars = page.locator(".lesson-card").first.locator(".lesson-stars").inner_text()
        check("Lesson 1 card shows 1 / 4 stars after one success", lesson1_stars.strip() == "1 / 4 ⭐", f"got {lesson1_stars!r}")

        # ---------- TTS voice-selection wiring doesn't throw ----------
        speech_ok = page.evaluate(
            """
            (() => {
              try {
                if (!('speechSynthesis' in window)) return 'no-speech-api';
                window.speechSynthesis.getVoices();
                return 'ok';
              } catch (e) { return 'error: ' + e.message; }
            })()
            """
        )
        check("speech synthesis voice lookup runs without throwing", speech_ok == "ok", f"got {speech_ok}")

        browser.close()

    print()
    if FAILURES:
        print(f"{len(FAILURES)} FAILURE(S):")
        for f in FAILURES:
            print("  -", f)
        sys.exit(1)
    else:
        print("All checks passed.")


if __name__ == "__main__":
    main()
