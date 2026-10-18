"""Generate the raster images the site serves from static/: favicon.ico, favicon.svg,
apple-touch-icon.png and the 1200x630 social preview og.png. Run once after a design
change: python scripts/make-images.py  (needs Pillow and the Segoe UI / Arial fonts)."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "static"
FONTS = Path("C:/Windows/Fonts")
BLUE, LIGHT, WHITE = (29, 78, 216), (147, 197, 253), (255, 255, 255)

FAVICON_SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#1d4ed8"/><circle cx="16" cy="17" r="9" fill="none" stroke="#fff" stroke-width="2.5"/><circle cx="16" cy="17" r="4.5" fill="#93c5fd"/><rect x="6" y="4" width="8" height="3" rx="1.5" fill="#fff"/></svg>
"""


def font(name, size):
    for candidate in (name, "arialbd.ttf", "arial.ttf"):
        path = FONTS / candidate
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def icon(size):
    """The washing-machine logo drawn at `size` px, matching favicon.svg (32 px grid)."""
    k = size / 32
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=8 * k, fill=BLUE)
    d.ellipse([7 * k, 8 * k, 25 * k, 26 * k], outline=WHITE, width=max(1, round(2.5 * k)))
    d.ellipse([11.5 * k, 12.5 * k, 20.5 * k, 21.5 * k], fill=LIGHT)
    d.rounded_rectangle([6 * k, 4 * k, 14 * k, 7 * k], radius=1.5 * k, fill=WHITE)
    return img


def og():
    w, h = 1200, 630
    img = Image.new("RGB", (w, h), (16, 18, 22))
    d = ImageDraw.Draw(img)
    for y in range(h):  # soft diagonal-ish gradient towards blue-grey
        t = y / h
        d.line([(0, y), (w, y)], fill=(int(16 + 11 * t), int(18 + 18 * t), int(22 + 29 * t)))
    logo = icon(150)
    img.paste(logo, (90, 90), logo)
    d.text((270, 92), "Старая стиралка", font=font("segoeuib.ttf", 76), fill=(232, 234, 239))
    d.text((272, 186), "Old Washer Guide", font=font("segoeui.ttf", 40), fill=(152, 161, 176))
    lines = [
        "Как пользоваться старой стиральной машиной:",
        "панель как на вашей машине, куда ставить ручки,",
        "сколько идёт стирка и куда сыпать порошок.",
    ]
    for i, line in enumerate(lines):
        d.text((90, 320 + i * 58), line, font=font("segoeui.ttf", 42), fill=(220, 224, 232))
    d.text((90, 528), "washguide.ru", font=font("segoeuib.ttf", 44), fill=(138, 180, 255))
    d.text((420, 536), "RU / EN · время стирки и конфликты настроек", font=font("segoeui.ttf", 32), fill=(152, 161, 176))
    return img


def main():
    OUT.mkdir(exist_ok=True)
    (OUT / "favicon.svg").write_text(FAVICON_SVG, encoding="utf-8")
    icon(256).save(OUT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
    touch = Image.new("RGB", (180, 180), BLUE)
    t = icon(180)
    touch.paste(t, (0, 0), t)
    touch.save(OUT / "apple-touch-icon.png")
    og().save(OUT / "og.png", optimize=True)
    print("static/: favicon.svg favicon.ico apple-touch-icon.png og.png")


if __name__ == "__main__":
    main()
