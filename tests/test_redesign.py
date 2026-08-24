import os
from playwright.sync_api import sync_playwright

BASE = "http://localhost:8000/index.html"
errors = []
OUT = "tests/_shots"
os.makedirs(OUT, exist_ok=True)

def check_errors(page, tag):
    page.on("console", lambda m: errors.append(f"[{tag} console {m.type}] {m.text}") if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(f"[{tag} pageerror] {e}"))

with sync_playwright() as p:
    browser = p.chromium.launch()

    # ---------- LIGHT MODE, iPhone-ish ----------
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, color_scheme="light")
    page = ctx.new_page()
    check_errors(page, "light-iphone")
    page.goto(BASE)
    page.wait_for_selector(".letter-tile")
    assert page.locator(".letter-tile").count() == 51
    page.wait_for_timeout(600)
    page.screenshot(path=f"{OUT}/light_home_iphone.png", full_page=False)

    page.locator(".letter-tile").first.click()
    page.wait_for_timeout(400)
    assert page.locator("#big-letter-preview").inner_text() == "అ"
    page.screenshot(path=f"{OUT}/light_practice_iphone.png", full_page=False)

    # draw + done -> celebration
    box = page.locator("#draw-canvas").bounding_box()
    cx, cy = box["x"] + box["width"] / 2, box["y"] + box["height"] / 2
    page.mouse.move(cx - 70, cy - 70)
    page.mouse.down()
    for i in range(8):
        page.mouse.move(cx - 70 + i * 18, cy - 70 + i * 14, steps=2)
    page.mouse.up()
    has_ink = page.evaluate("""() => { const c=document.getElementById('draw-canvas'); const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data; for(let i=3;i<d.length;i+=4){if(d[i]!==0) return true;} return false; }""")
    assert has_ink, "drawing failed"

    page.locator("#btn-done").click()
    page.wait_for_timeout(250)
    page.screenshot(path=f"{OUT}/light_celebration.png", full_page=False)
    page.wait_for_timeout(1400)
    assert page.locator("#big-letter-preview").inner_text() == "ఆ"

    progress = page.evaluate("() => JSON.parse(localStorage.getItem('vidyarthi-progress-v1') || '{}')")
    assert progress.get("0") is True

    page.locator("#btn-home").click()
    page.wait_for_timeout(300)
    assert page.locator(".letter-tile.practiced").count() == 1
    page.screenshot(path=f"{OUT}/light_home_with_star.png", full_page=True)
    ctx.close()

    # ---------- DARK MODE (night sky), iPhone ----------
    ctx2 = browser.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, color_scheme="dark")
    page2 = ctx2.new_page()
    check_errors(page2, "dark-iphone")
    page2.goto(BASE)
    page2.wait_for_selector(".letter-tile")
    page2.wait_for_timeout(700)
    page2.screenshot(path=f"{OUT}/dark_home_iphone.png", full_page=False)
    page2.locator(".letter-tile").nth(20).click()
    page2.wait_for_timeout(400)
    page2.screenshot(path=f"{OUT}/dark_practice_iphone.png", full_page=False)
    ctx2.close()

    # ---------- LIGHT MODE, iPad ----------
    ctx3 = browser.new_context(viewport={"width": 834, "height": 1194}, has_touch=True, color_scheme="light")
    page3 = ctx3.new_page()
    check_errors(page3, "light-ipad")
    page3.goto(BASE)
    page3.wait_for_selector(".letter-tile")
    page3.wait_for_timeout(600)
    page3.screenshot(path=f"{OUT}/light_home_ipad.png", full_page=False)
    page3.locator(".letter-tile").nth(15).click()
    page3.wait_for_timeout(400)
    page3.screenshot(path=f"{OUT}/light_practice_ipad.png", full_page=False)
    ctx3.close()

    # ---------- Reduced motion check ----------
    ctx4 = browser.new_context(viewport={"width": 390, "height": 844}, reduced_motion="reduce")
    page4 = ctx4.new_page()
    check_errors(page4, "reduced-motion")
    page4.goto(BASE)
    page4.wait_for_selector(".letter-tile")
    page4.wait_for_timeout(300)
    ctx4.close()

    browser.close()

print("Screenshots written to", OUT)
if errors:
    print("\n=== ERRORS ===")
    for e in errors:
        print(e)
    raise SystemExit(1)
print("\nNo console/page errors. ALL CHECKS PASSED.")
