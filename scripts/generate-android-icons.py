#!/usr/bin/env python3
"""Regenerate Android launcher icons from the PWA icon.

Source of truth is the same file the PWA manifest uses:
    assets/pwa-icon-512.png

Outputs legacy mipmap PNGs plus the adaptive-icon foreground drawable:
    android/app/src/main/res/mipmap-*/ic_launcher{,_round}.png
    android/app/src/main/res/drawable-nodpi/ic_launcher_foreground.png

Usage:
    python3 scripts/generate-android-icons.py
"""

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "pwa-icon-512.png"
RES = ROOT / "android" / "app" / "src" / "main" / "res"

# Legacy launcher sizes per density.
DENSITIES = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}
# Adaptive-icon foreground (full-bleed 108dp @ xxxhdpi).
FOREGROUND_SIZE = 432


def circle_cropped(img: Image.Image) -> Image.Image:
    """Return a copy of img masked to a centered circle (for ic_launcher_round)."""
    size = img.size[0]
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size, size), fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"PWA icon not found: {SRC}")
    with Image.open(SRC).convert("RGBA") as src:
        if src.size[0] != src.size[1]:
            raise SystemExit(f"Expected a square PWA icon, got {src.size}")
        base = src.resize((FOREGROUND_SIZE, FOREGROUND_SIZE), Image.LANCZOS)

        foreground_dir = RES / "drawable-nodpi"
        foreground_dir.mkdir(parents=True, exist_ok=True)
        base.save(foreground_dir / "ic_launcher_foreground.png")
        print(f"wrote drawable-nodpi/ic_launcher_foreground.png ({FOREGROUND_SIZE}x{FOREGROUND_SIZE})")

        for density, px in DENSITIES.items():
            d = RES / density
            d.mkdir(parents=True, exist_ok=True)
            base.resize((px, px), Image.LANCZOS).save(d / "ic_launcher.png")
            circle_cropped(base.resize((px, px), Image.LANCZOS)).save(d / "ic_launcher_round.png")
            print(f"wrote {density}/ic_launcher.png + ic_launcher_round.png ({px}x{px})")


if __name__ == "__main__":
    main()
