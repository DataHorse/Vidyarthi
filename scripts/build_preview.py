#!/usr/bin/env python3
"""Builds a single-file, self-contained preview of the app (for Claude
Artifact-style hosting where only one HTML file can be published).

Inlines css/style.css and js/{letters,app}.js directly into index.html's
markup, strips the PWA-install bits (manifest link, apple-touch-icon,
service-worker registration) that don't apply to a preview iframe, and
writes the result to the given output path.

Usage: python3 scripts/build_preview.py [output_path]
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "preview.html"

html = (ROOT / "index.html").read_text(encoding="utf-8")
css = (ROOT / "css" / "style.css").read_text(encoding="utf-8")
letters_js = (ROOT / "js" / "letters.js").read_text(encoding="utf-8")
app_js = (ROOT / "js" / "app.js").read_text(encoding="utf-8")

# Strip the service-worker registration block — sw.js isn't shipped with
# the single-file preview and there's nothing useful for it to cache there.
app_js = re.sub(
    r"\s*// ---------- PWA: register service worker ----------.*?\n  \}\n",
    "\n",
    app_js,
    flags=re.DOTALL,
)

# Pull just the body content out of index.html.
body_match = re.search(r"<body>(.*)</body>", html, flags=re.DOTALL)
body = body_match.group(1)
# Drop the external <script src> tags — we inline the JS ourselves below.
body = re.sub(r'\n?<script src="js/(letters|app)\.js"></script>', "", body)

head_bits = []
head_bits.append('<meta charset="UTF-8">')
head_bits.append("<title>Vidyarthi</title>")
head_bits.append(
    '<meta name="viewport" content="width=device-width, initial-scale=1, '
    'maximum-scale=1, user-scalable=no, viewport-fit=cover">'
)
head_bits.append(
    '<meta name="description" content="Vidyarthi is a fun, friendly app for '
    'kids to learn to trace and write Telugu letters, set in a sky full of '
    'kites, rainbows and a unicorn friend.">'
)
head_bits.append('<link rel="preconnect" href="https://fonts.googleapis.com">')
head_bits.append('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>')
head_bits.append(
    '<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&'
    'family=Quicksand:wght@500;600;700&family=Noto+Sans+Telugu:wght@500;700;900&'
    'display=swap" rel="stylesheet">'
)

preview_badge_css = """
.preview-badge {
  text-align: center;
  font-size: .72rem;
  font-weight: 700;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: var(--accent-purple);
  background: #F1EDFF;
  border-radius: 999px;
  padding: 5px 14px;
  margin: 10px auto 0;
  display: table;
  position: relative;
  z-index: 1;
}
"""

out = []
out.extend(head_bits)
out.append("<style>")
out.append(css)
out.append(preview_badge_css)
out.append("</style>")
out.append(body.replace(
    '<footer class="home-footer">',
    '<p class="preview-badge">Live preview · not saved permanently</p>\n    <footer class="home-footer">',
))
out.append("<script>")
out.append(letters_js)
out.append(app_js)
out.append("</script>")

OUT.write_text("\n".join(out), encoding="utf-8")
print(f"wrote {OUT} ({OUT.stat().st_size:,} bytes)")
