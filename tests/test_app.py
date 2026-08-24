# Smoke test for Vidyarthi.
# Usage:
#   python3 -m http.server 8765 &   (run from the repo root)
#   pip install playwright && playwright install chromium
#   python3 tests/test_app.py
import os
import sys
from playwright.sync_api import sync_playwright

BASE = "http://localhost:8000/index.html"
SHOTS_DIR = os.path.join(os.path.dirname(__file__), "_screenshots")
errors = []

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        # ---- iPhone-ish viewport ----
        context = browser.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True)
        page = context.new_page()
        page.on("console", lambda msg: errors.append(f"[console {msg.type}] {msg.text}") if msg.type == "error" else None)
        page.on("pageerror", lambda exc: errors.append(f"[pageerror] {exc}"))

        page.goto(BASE)
        page.wait_for_selector("#letter-grid-wrap .letter-tile")

        tile_count = page.locator(".letter-tile").count()
        print("Letter tiles rendered:", tile_count)
        assert tile_count == 51, f"expected 51 letters, got {tile_count}"

        star_max = page.locator("#star-total-max").inner_text()
        print("Star max label:", star_max)

        page.screenshot(path="tests/_screenshots/01_home_iphone.png", full_page=True)

        # Open first letter (అ)
        page.locator(".letter-tile").first.click()
        page.wait_for_selector("#practice-screen:not(.hidden)")
        page.wait_for_timeout(300)
        big_letter = page.locator("#big-letter-preview").inner_text()
        print("First practice letter:", big_letter)
        assert big_letter == "అ"

        page.screenshot(path="tests/_screenshots/02_practice_a_iphone.png", full_page=True)

        # Tap sound buttons (should not throw even without TTS voices in headless)
        page.locator("#btn-say-letter").click()
        page.locator("#btn-say-word").click()
        page.wait_for_timeout(200)

        # Simulate a finger trace on the canvas using touch-like mouse drag
        box = page.locator("#draw-canvas").bounding_box()
        cx, cy = box["x"] + box["width"] / 2, box["y"] + box["height"] / 2
        page.mouse.move(cx - 80, cy - 80)
        page.mouse.down()
        for i in range(10):
            page.mouse.move(cx - 80 + i * 16, cy - 80 + i * 12, steps=2)
        page.mouse.up()
        page.wait_for_timeout(150)

        page.screenshot(path="tests/_screenshots/03_after_drawing.png", full_page=True)

        # Verify the draw canvas actually has non-transparent pixels now
        has_ink = page.evaluate("""
            () => {
                const c = document.getElementById('draw-canvas');
                const ctx = c.getContext('2d');
                const data = ctx.getImageData(0, 0, c.width, c.height).data;
                for (let i = 3; i < data.length; i += 4) {
                    if (data[i] !== 0) return true;
                }
                return false;
            }
        """)
        print("Canvas has ink after drawing:", has_ink)
        assert has_ink, "drawing did not register on canvas"

        # Clear button wipes it
        page.locator("#btn-clear").click()
        page.wait_for_timeout(100)
        has_ink_after_clear = page.evaluate("""
            () => {
                const c = document.getElementById('draw-canvas');
                const ctx = c.getContext('2d');
                const data = ctx.getImageData(0, 0, c.width, c.height).data;
                for (let i = 3; i < data.length; i += 4) {
                    if (data[i] !== 0) return true;
                }
                return false;
            }
        """)
        print("Canvas has ink after clear:", has_ink_after_clear)
        assert not has_ink_after_clear

        # "I'm done" -> celebration -> auto-advance, progress saved
        page.locator("#btn-done").click()
        page.wait_for_timeout(200)
        overlay_visible = page.locator("#celebrate-overlay").is_visible()
        print("Celebration overlay visible:", overlay_visible)
        page.screenshot(path="tests/_screenshots/04_celebration.png", full_page=True)
        page.wait_for_timeout(1500)

        second_letter = page.locator("#big-letter-preview").inner_text()
        print("Auto-advanced to:", second_letter)
        assert second_letter == "ఆ"

        progress = page.evaluate("() => JSON.parse(localStorage.getItem('vidyarthi-progress-v1') || '{}')")
        print("Progress saved:", progress)
        assert progress.get("0") is True

        # Prev/Next navigation
        page.locator("#btn-prev").click()
        page.wait_for_timeout(200)
        assert page.locator("#big-letter-preview").inner_text() == "అ"
        page.locator("#btn-next").click()
        page.locator("#btn-next").click()
        page.wait_for_timeout(200)
        print("After next x2:", page.locator("#big-letter-preview").inner_text())

        # Back to home, star should now show for అ
        page.locator("#btn-home").click()
        page.wait_for_timeout(200)
        practiced_tiles = page.locator(".letter-tile.practiced").count()
        print("Practiced tiles on home:", practiced_tiles)
        assert practiced_tiles == 1
        page.screenshot(path="tests/_screenshots/05_home_with_star.png", full_page=True)

        context.close()

        # ---- iPad-ish viewport screenshot for visual check ----
        context2 = browser.new_context(viewport={"width": 834, "height": 1194}, has_touch=True)
        page2 = context2.new_page()
        page2.on("pageerror", lambda exc: errors.append(f"[pageerror-ipad] {exc}"))
        page2.goto(BASE)
        page2.wait_for_selector(".letter-tile")
        page2.screenshot(path="tests/_screenshots/06_home_ipad.png", full_page=True)
        page2.locator(".letter-tile").nth(15).click()  # first consonant క
        page2.wait_for_timeout(300)
        print("iPad practice letter:", page2.locator("#big-letter-preview").inner_text())
        page2.screenshot(path="tests/_screenshots/07_practice_ipad.png", full_page=True)
        context2.close()

        browser.close()

if __name__ == "__main__":
    import os
    os.makedirs(SHOTS_DIR, exist_ok=True)
    run()
    if errors:
        print("\n=== JS ERRORS ===")
        for e in errors:
            print(e)
        sys.exit(1)
    else:
        print("\nNo console/page errors. ALL CHECKS PASSED.")
