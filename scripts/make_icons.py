from PIL import Image, ImageDraw

def lerp(a, b, t):
    return tuple(int(a[i] * (1 - t) + b[i] * t) for i in range(3))

def make_icon(size, path, maskable=False):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Sky gradient background: blue (top) -> pink (bottom), our brand sky-to-rainbow feel
    top = (79, 168, 240)     # sky blue
    bottom = (255, 111, 165)  # accent pink
    for y in range(size):
        t = y / size
        d.line([(0, y), (size, y)], fill=lerp(top, bottom, t) + (255,))

    if not maskable:
        mask = Image.new("L", (size, size), 0)
        md = ImageDraw.Draw(mask)
        radius = int(size * 0.22)
        md.rounded_rectangle([0, 0, size, size], radius=radius, fill=255)
        bg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        bg.paste(img, (0, 0), mask)
        img = bg
        d = ImageDraw.Draw(img)

    cx, cy = size / 2, size * 0.56
    face_r = size * 0.30

    # Ear (left, behind horn)
    d.ellipse([cx - face_r * 1.05, cy - face_r * 1.35, cx - face_r * 0.55, cy - face_r * 0.55],
              fill=(255, 251, 242, 255), outline=(58, 51, 88, 255), width=max(2, size // 90))

    # Horn
    horn_w = size * 0.075
    d.polygon([
        (cx - horn_w * 0.15, cy - face_r * 1.55),
        (cx + horn_w * 0.9, cy - face_r * 0.85),
        (cx - horn_w * 0.9, cy - face_r * 0.85),
    ], fill=(255, 200, 30, 255), outline=(58, 51, 88, 255))

    # Face
    d.ellipse([cx - face_r, cy - face_r * 0.95, cx + face_r, cy + face_r * 0.95],
              fill=(255, 251, 242, 255), outline=(58, 51, 88, 255), width=max(3, size // 70))

    # Blush
    blush_r = face_r * 0.22
    d.ellipse([cx - face_r * 0.72 - blush_r, cy + face_r * 0.12 - blush_r,
               cx - face_r * 0.72 + blush_r, cy + face_r * 0.12 + blush_r], fill=(255, 179, 206, 180))
    d.ellipse([cx + face_r * 0.72 - blush_r, cy + face_r * 0.12 - blush_r,
               cx + face_r * 0.72 + blush_r, cy + face_r * 0.12 + blush_r], fill=(255, 179, 206, 180))

    # Eyes
    eye_r = face_r * 0.14
    for ex in (cx - face_r * 0.36, cx + face_r * 0.36):
        d.ellipse([ex - eye_r, cy - eye_r * 1.15, ex + eye_r, cy + eye_r * 1.15], fill=(58, 51, 88, 255))

    # Mane hint (a few rainbow strokes along the right side of the face)
    mane_colors = [(255, 111, 165), (185, 131, 255), (77, 150, 255)]
    x0 = cx + face_r * 0.78
    for i, c in enumerate(mane_colors):
        y0 = cy - face_r * 0.5 + i * face_r * 0.5
        d.arc([x0 - face_r * 0.5, y0 - face_r * 0.35, x0 + face_r * 0.7, y0 + face_r * 0.55],
              start=300, end=120, fill=c + (255,), width=max(4, size // 40))

    img.save(path)
    print("wrote", path, size)

make_icon(192, "assets/icons/icon-192.png")
make_icon(512, "assets/icons/icon-512.png")
make_icon(512, "assets/icons/icon-512-maskable.png", maskable=True)
make_icon(180, "assets/icons/apple-touch-icon.png")
