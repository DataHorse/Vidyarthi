"""
Tests Chapter 2 (గుణింతం): every consonant combined with the 15 dependent
vowel signs, and the home screen's Chapter 1 / Chapter 2 grouping.

Run with a server already serving the app root at http://localhost:8000:
    python3 -m http.server 8000 --directory /home/claude/vidyarthi &
    python3 tests/test_chapters.py
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
        page = browser.new_page(viewport={"width": 430, "height": 932})
        page.goto(BASE)
        page.wait_for_timeout(300)

        # ---------- Data shape ----------
        counts = page.evaluate(
            """
            (() => ({
              letters: LETTERS.length,
              consonants: CONSONANTS.length,
              vowelSigns: VOWEL_SIGNS.length,
              lessons: LESSONS.length,
              chapter1: LESSONS.filter(l => l.chapter === 1).length,
              chapter2: LESSONS.filter(l => l.chapter === 2).length,
            }))()
            """
        )
        check("36 consonants", counts["consonants"] == 36, f"got {counts}")
        check("15 dependent vowel signs", counts["vowelSigns"] == 15, f"got {counts}")
        check("592 total letters (52 + 36x15)", counts["letters"] == 592, f"got {counts}")
        check("48 total lessons (12 + 36)", counts["lessons"] == 48, f"got {counts}")
        check("Chapter 1 has 12 lessons", counts["chapter1"] == 12, f"got {counts}")
        check("Chapter 2 has 36 lessons", counts["chapter2"] == 36, f"got {counts}")

        # ---------- Each Chapter-2 lesson has exactly 15 letters, all
        # starting with that lesson's consonant ----------
        shapes_ok = page.evaluate(
            """
            (() => {
              const ch2 = LESSONS.filter(l => l.chapter === 2);
              return ch2.every(lesson => {
                if (lesson.letters.length !== 15) return false;
                const base = lesson.letters[0].telugu[0];
                return lesson.letters.every(l => l.telugu.startsWith(base) && l.telugu.length > base.length);
              });
            })()
            """
        )
        check("every Chapter 2 lesson has 15 letters, all starting with its consonant", shapes_ok)

        # ---------- A specific combination renders/transliterates correctly ----------
        ka_aa = page.evaluate("LETTERS.find(l => l.telugu === 'కా')")
        check("క + ా (aa) composes to కా / 'kaa'", ka_aa is not None and ka_aa["translit"] == "kaa", f"got {ka_aa}")

        ksha_r = page.evaluate("LETTERS.find(l => l.telugu === 'క్షృ')")
        check("క్ష + ృ (r) composes to క్షృ / 'kshr'", ksha_r is not None and ksha_r["translit"] == "kshr", f"got {ksha_r}")

        rra_aha = page.evaluate("LETTERS.find(l => l.telugu === 'ఱః')")
        check("ఱ + ః (aha) composes to ఱః / 'RRaha'", rra_aha is not None and rra_aha["translit"] == "RRaha", f"got {rra_aha}")

        # ---------- No id or telugu-string collisions across the whole set ----------
        dup_check = page.evaluate(
            """
            (() => ({
              uniqueTelugu: new Set(LETTERS.map(l => l.telugu)).size,
              uniqueIds: new Set(LETTERS.map(l => l.id)).size,
              total: LETTERS.length,
            }))()
            """
        )
        check("every letter's telugu glyph is unique", dup_check["uniqueTelugu"] == dup_check["total"], f"got {dup_check}")
        check("every letter's id is unique", dup_check["uniqueIds"] == dup_check["total"], f"got {dup_check}")

        # ---------- Chapter 2 combos don't pollute Chapter 1's "group" filters ----------
        other_group_count = page.evaluate("LETTERS.filter(l => l.group === 'Other letters').length")
        check("'Other letters' group still has exactly 11 (not diluted by గుణింతం combos)", other_group_count == 11, f"got {other_group_count}")

        # ---------- Home screen renders two chapter sections ----------
        chapter_titles = page.locator(".chapter-title").all_inner_texts()
        check("home screen shows Chapter 1 and Chapter 2 headers", chapter_titles == ["Chapter 1", "Chapter 2"], f"got {chapter_titles}")

        lists = page.locator(".lesson-list")
        check("two separate lesson-list sections", lists.count() == 2)
        check("first lesson-list (Chapter 1) has 12 cards", lists.nth(0).locator(".lesson-card").count() == 12)
        check("second lesson-list (Chapter 2) has 36 cards", lists.nth(1).locator(".lesson-card").count() == 36)

        star_max = page.locator("#star-total-max").inner_text()
        check("star total max reflects all 592 letters", star_max.strip() == "592", f"got {star_max!r}")

        # ---------- Collapsible chapters: sensible defaults ----------
        # On a fresh profile (nothing practiced anywhere yet), Chapter 1 is
        # the "first incomplete chapter" so it opens by default; Chapter 2
        # stays tucked away until the child (or this test) opens it.
        headers = page.locator(".chapter-header")
        check("Chapter 1 header starts expanded", "expanded" in (headers.nth(0).get_attribute("class") or ""))
        check("Chapter 1 header aria-expanded=true", headers.nth(0).get_attribute("aria-expanded") == "true")
        check("Chapter 2 header starts collapsed", "expanded" not in (headers.nth(1).get_attribute("class") or ""))
        check("Chapter 2 header aria-expanded=false", headers.nth(1).get_attribute("aria-expanded") == "false")
        check("Chapter 1's lesson list is visible", lists.nth(0).is_visible())
        check("Chapter 2's lesson list is hidden", not lists.nth(1).is_visible())

        # ---------- Collapsible chapters: manual toggle + persistence ----------
        headers.nth(1).click()
        page.wait_for_timeout(120)
        check("Chapter 2 expands on click", "expanded" in (headers.nth(1).get_attribute("class") or ""))
        check("Chapter 2's lesson list becomes visible", lists.nth(1).is_visible())

        headers.nth(0).click()
        page.wait_for_timeout(120)
        check("Chapter 1 collapses on click (explicit override)", "expanded" not in (headers.nth(0).get_attribute("class") or ""))
        check("Chapter 1's lesson list becomes hidden", not lists.nth(0).is_visible())

        chapter_ui_stored = page.evaluate("JSON.parse(localStorage.getItem('vidyarthi-chapter-ui-v1') || '{}')")
        check(
            "manual chapter toggles are persisted to localStorage",
            chapter_ui_stored.get("1") is False and chapter_ui_stored.get("2") is True,
            f"got {chapter_ui_stored}",
        )

        # Reload: the explicit overrides should stick (Chapter 1 collapsed,
        # Chapter 2 expanded — the opposite of the computed default).
        page.reload()
        page.wait_for_timeout(300)
        headers2 = page.locator(".chapter-header")
        lists2 = page.locator(".lesson-list")
        check("override survives reload: Chapter 1 stays collapsed", "expanded" not in (headers2.nth(0).get_attribute("class") or ""))
        check("override survives reload: Chapter 2 stays expanded", "expanded" in (headers2.nth(1).get_attribute("class") or ""))
        check("override survives reload: Chapter 2 list visible", lists2.nth(1).is_visible())

        # Reset back to the default state (both un-overridden) for the rest
        # of this test file's assertions, which assume the computed default.
        page.evaluate("localStorage.removeItem('vidyarthi-chapter-ui-v1')")
        page.reload()
        page.wait_for_timeout(300)

        # ---------- Opening a Chapter 2 lesson works like any other lesson ----------
        # Chapter 2 starts collapsed by default (Chapter 1 is the one "in
        # progress" on a fresh profile), so expand its header first.
        page.locator(".chapter-header").nth(1).click()
        page.wait_for_timeout(150)
        # Lesson 13 (index 12) is the first Chapter 2 lesson: క + every vowel sign.
        page.locator(".lesson-card").nth(12).click()
        page.wait_for_timeout(400)
        big_letter = page.locator("#big-letter-preview").inner_text().strip()
        check("first Chapter 2 lesson opens on కా", big_letter == "కా", f"got {big_letter!r}")
        group_pill = page.locator("#group-pill").inner_text().strip()
        check("group pill shows Lesson 13", group_pill == "Lesson 13", f"got {group_pill!r}")
        progress_pill = page.locator("#progress-pill").inner_text().strip()
        check("progress pill shows 1 / 15", progress_pill == "1 / 15", f"got {progress_pill!r}")

        # కా has a researched example word (కాకి / Kaaki / Crow) — the word
        # row should show it, with audio wired up like any other letter.
        word_row_class = page.locator("#word-row").get_attribute("class") or ""
        check("word row is visible for కా (has an example word)", "hidden" not in word_row_class, f"got {word_row_class!r}")
        word_tel = page.locator("#word-tel").inner_text().strip()
        check("word row shows కాకి for కా", word_tel == "కాకి", f"got {word_tel!r}")

        # Most గుణింతం combos still have no example word (only ~30% of the
        # 540 combos have a genuinely good, real word available) — the word
        # row should stay hidden for those. కీ (2 letters after కా in the
        # క lesson) is one of the combos with no word data.
        page.locator("#btn-next").click()
        page.locator("#btn-next").click()
        page.wait_for_timeout(200)
        letter_after_next = page.locator("#big-letter-preview").inner_text().strip()
        check("landed on కీ (no word data)", letter_after_next == "కీ", f"got {letter_after_next!r}")
        no_word_row_class = page.locator("#word-row").get_attribute("class") or ""
        check(
            f"word row is hidden for {letter_after_next} (no example word data)",
            "hidden" in no_word_row_class,
            f"got {no_word_row_class!r}",
        )

        # Trace guide still paints (not blank) by default.
        guide_ink = page.evaluate("window.__vidyarthiTest.getGuideInkCount()")
        check("Chapter 2 letter still shows a traceable dashed guide by default", guide_ink > 0, f"got {guide_ink}")

        # ---------- Renamed "I'm done!" button ----------
        done_label = page.locator("#btn-done-label").inner_text().strip()
        check("done button no longer says \"I'm done!\"", done_label != "I'm done!", f"got {done_label!r}")
        check("done button has a non-empty label", len(done_label) > 0)

        # ---------- Letter picker: jump to another letter in this lesson ----------
        # Still on Lesson 13 (క + every vowel sign), at కీ (index 2). Jump
        # back to కా and actually pass a trace on it, so the picker has a
        # genuinely "practiced" tile to check for.
        page.locator("#btn-prev").click()
        page.locator("#btn-prev").click()
        page.wait_for_timeout(200)
        check("back on కా", page.locator("#big-letter-preview").inner_text().strip() == "కా")
        page.evaluate("window.__vidyarthiTest.paintPerfectFillForTest()")
        page.locator("#btn-done").click()
        page.wait_for_timeout(1900)
        check("కా is now practiced", page.evaluate("window.__vidyarthiTest.isPracticeMode()") is True)
        # A passing trace switches into Practice mode on the same letter —
        # move to కీ (index 2) the same way the earlier assertions expect.
        page.locator("#btn-next").click()
        page.locator("#btn-next").click()
        page.wait_for_timeout(150)
        check("back on కీ", page.locator("#big-letter-preview").inner_text().strip() == "కీ")

        check("picker overlay starts hidden", "hidden" in (page.locator("#lesson-picker-overlay").get_attribute("class") or ""))

        page.locator("#group-pill").click()
        page.wait_for_timeout(150)
        check("picker overlay opens from the lesson-name pill", "hidden" not in (page.locator("#lesson-picker-overlay").get_attribute("class") or ""))
        tiles = page.locator(".picker-tile")
        check("picker shows all 15 letters of the lesson", tiles.count() == 15)
        check("current letter (కీ) is marked current", "current" in (tiles.nth(2).get_attribute("class") or ""))
        check("just-practiced కా is marked practiced in the picker", "practiced" in (tiles.nth(0).get_attribute("class") or ""))

        # Tapping a tile jumps straight to that letter and closes the picker.
        tiles.nth(5).click()
        page.wait_for_timeout(200)
        check("picker closes after picking a letter", "hidden" in (page.locator("#lesson-picker-overlay").get_attribute("class") or ""))
        jumped_letter = page.locator("#big-letter-preview").inner_text().strip()
        expected_letter = page.evaluate("LESSONS[12].letters[5].telugu")
        check(f"jumped to the picked letter ({expected_letter})", jumped_letter == expected_letter, f"got {jumped_letter!r}")
        jumped_progress_pill = page.locator("#progress-pill").inner_text().strip()
        check("progress pill updated after picker jump", jumped_progress_pill == "6 / 15", f"got {jumped_progress_pill!r}")

        # The progress pill opens the same picker.
        page.locator("#progress-pill").click()
        page.wait_for_timeout(150)
        check("picker overlay also opens from the progress pill", "hidden" not in (page.locator("#lesson-picker-overlay").get_attribute("class") or ""))
        # Closing via the X button works.
        page.locator("#lesson-picker-close").click()
        page.wait_for_timeout(150)
        check("picker closes via the close button", "hidden" in (page.locator("#lesson-picker-overlay").get_attribute("class") or ""))

        # Closing via the backdrop also works.
        page.locator("#group-pill").click()
        page.wait_for_timeout(150)
        page.locator("#lesson-picker-backdrop").click(position={"x": 5, "y": 5})
        page.wait_for_timeout(150)
        check("picker closes via backdrop click", "hidden" in (page.locator("#lesson-picker-overlay").get_attribute("class") or ""))

        # Escape also closes it.
        page.locator("#group-pill").click()
        page.wait_for_timeout(150)
        page.keyboard.press("Escape")
        page.wait_for_timeout(150)
        check("picker closes on Escape", "hidden" in (page.locator("#lesson-picker-overlay").get_attribute("class") or ""))

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
