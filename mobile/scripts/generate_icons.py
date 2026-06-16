#!/usr/bin/env python3
"""
generate_icons.py — Longevify app icon generator
Generates all required iOS and Android app icons from a simple "L" lettermark.

Brand colors:
  brand-700 (primary green): #1f5d3f
  brand-900 (dark green):    #0d2818
  white:                     #ffffff

Usage:
  cd mobile/
  python3 scripts/generate_icons.py
"""

import os
import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("ERROR: Pillow not found. Install with: pip install Pillow")
    sys.exit(1)

SCRIPT_DIR = Path(__file__).parent
MOBILE_DIR = SCRIPT_DIR.parent

BG_COLOR = (13, 40, 24)       # #0d2818 brand-900
FG_COLOR = (31, 93, 63)       # #1f5d3f brand-700
TEXT_COLOR = (255, 255, 255)  # white

def draw_icon(size: int) -> Image.Image:
    """Create a square icon with background gradient and 'L' lettermark."""
    img = Image.new("RGBA", (size, size), BG_COLOR + (255,))
    draw = ImageDraw.Draw(img)

    # Draw a rounded-rect-ish circle as accent
    margin = int(size * 0.08)
    draw.ellipse(
        [margin, margin, size - margin, size - margin],
        fill=FG_COLOR + (80,),
    )

    # Draw "L" text centered
    font_size = int(size * 0.55)
    font = None
    # Try system fonts
    font_paths = [
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/HelveticaNeue.ttc",
        "/System/Library/Fonts/Arial.ttf",
        "/Library/Fonts/Arial.ttf",
    ]
    for fp in font_paths:
        if os.path.exists(fp):
            try:
                font = ImageFont.truetype(fp, font_size)
                break
            except Exception:
                continue

    if font is None:
        font = ImageFont.load_default()

    text = "L"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    x = (size - text_w) // 2 - bbox[0]
    y = (size - text_h) // 2 - bbox[1]

    # Slight shadow for depth
    draw.text((x + 2, y + 2), text, font=font, fill=(0, 0, 0, 80))
    draw.text((x, y), text, font=font, fill=TEXT_COLOR)

    return img


def save_png(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(str(path), "PNG", optimize=True)
    print(f"  wrote {path.relative_to(MOBILE_DIR)}")


def generate_ios_icons() -> None:
    print("\n--- iOS Icons ---")
    appiconset = MOBILE_DIR / "ios/App/App/Assets.xcassets/AppIcon.appiconset"
    appiconset.mkdir(parents=True, exist_ok=True)

    # (filename, size_px)
    sizes = [
        ("Icon-20.png",     20),
        ("Icon-20@2x.png",  40),
        ("Icon-20@3x.png",  60),
        ("Icon-29.png",     29),
        ("Icon-29@2x.png",  58),
        ("Icon-29@3x.png",  87),
        ("Icon-40.png",     40),
        ("Icon-40@2x.png",  80),
        ("Icon-40@3x.png",  120),
        ("Icon-60@2x.png",  120),
        ("Icon-60@3x.png",  180),
        ("Icon-76.png",     76),
        ("Icon-76@2x.png",  152),
        ("Icon-83.5@2x.png", 167),
        ("Icon-1024.png",   1024),
    ]

    entries = []
    for filename, px in sizes:
        img = draw_icon(px)
        save_png(img, appiconset / filename)
        # Build Contents.json entry
        scale = "1x"
        if "@2x" in filename:
            scale = "2x"
        elif "@3x" in filename:
            scale = "3x"
        entries.append({
            "filename": filename,
            "idiom": "universal" if px >= 1024 else "iphone",
            "scale": scale,
            "size": f"{px}x{px}" if scale == "1x" else f"{px // (2 if scale == '2x' else 3)}x{px // (2 if scale == '2x' else 3)}",
        })

    # Write Contents.json
    import json
    contents = {
        "images": [
            {
                "filename": e["filename"],
                "idiom": "universal",
                "platform": "ios",
                "size": e["filename"].replace("Icon-", "").replace(".png", "").replace("@2x", "").replace("@3x", "") + "x" + e["filename"].replace("Icon-", "").replace(".png", "").replace("@2x", "").replace("@3x", ""),
            }
            for e in entries
        ],
        "info": {"author": "xcode", "version": 1},
    }
    # Simpler: just write the images array with idiom universal
    contents_simple = {
        "images": [
            {"filename": e["filename"], "idiom": "universal", "scale": e["scale"]}
            for e in entries
        ],
        "info": {"author": "longevify-scripts", "version": 1},
    }
    with open(appiconset / "Contents.json", "w") as f:
        json.dump(contents_simple, f, indent=2)
    print(f"  wrote ios/App/App/Assets.xcassets/AppIcon.appiconset/Contents.json")


def generate_android_icons() -> None:
    print("\n--- Android Icons ---")
    res_base = MOBILE_DIR / "android/app/src/main/res"

    # mipmap densities: (folder, size_px)
    densities = [
        ("mipmap-mdpi",    48),
        ("mipmap-hdpi",    72),
        ("mipmap-xhdpi",   96),
        ("mipmap-xxhdpi",  144),
        ("mipmap-xxxhdpi", 192),
    ]

    for folder, px in densities:
        img = draw_icon(px)
        save_png(img, res_base / folder / "ic_launcher.png")
        # Round icon (same for now)
        save_png(img, res_base / folder / "ic_launcher_round.png")

    # Play Store 512px
    img_512 = draw_icon(512)
    save_png(img_512, MOBILE_DIR / "android/app/src/main/res/mipmap-web/ic_launcher.png")

    # Adaptive icon foreground (transparent bg, icon on top)
    print("\n--- Android Adaptive Icons ---")
    for folder, px in densities:
        # Foreground: just the L on transparent
        fg = Image.new("RGBA", (px, px), (0, 0, 0, 0))
        draw = ImageDraw.Draw(fg)
        font_size = int(px * 0.55)
        font = None
        for fp in ["/System/Library/Fonts/Helvetica.ttc", "/System/Library/Fonts/Arial.ttf"]:
            if os.path.exists(fp):
                try:
                    font = ImageFont.truetype(fp, font_size)
                    break
                except Exception:
                    continue
        if font is None:
            font = ImageFont.load_default()
        text = "L"
        bbox = draw.textbbox((0, 0), text, font=font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        draw.text(((px - tw) // 2 - bbox[0], (px - th) // 2 - bbox[1]), text, font=font, fill=TEXT_COLOR)
        save_png(fg, res_base / folder / "ic_launcher_foreground.png")

        # Background: solid brand-900
        bg = Image.new("RGBA", (px, px), BG_COLOR + (255,))
        save_png(bg, res_base / folder / "ic_launcher_background.png")


def generate_splash() -> None:
    print("\n--- Splash Screens ---")

    # iOS — 2732x2732 universal (used by LaunchScreen.storyboard)
    ios_splash_dir = MOBILE_DIR / "ios/App/App"
    size = 2732
    img = Image.new("RGBA", (size, size), BG_COLOR + (255,))
    draw = ImageDraw.Draw(img)
    font_size = int(size * 0.08)
    font = None
    for fp in ["/System/Library/Fonts/Helvetica.ttc", "/System/Library/Fonts/Arial.ttf"]:
        if os.path.exists(fp):
            try:
                font = ImageFont.truetype(fp, font_size)
                break
            except Exception:
                continue
    if font is None:
        font = ImageFont.load_default()
    text = "Longevify"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    draw.text(((size - tw) // 2 - bbox[0], (size - th) // 2 - bbox[1]), text, font=font, fill=TEXT_COLOR)
    splash_path = ios_splash_dir / "Splash.png"
    save_png(img, splash_path)

    # Android splash — put in res/drawable
    android_drawable = MOBILE_DIR / "android/app/src/main/res/drawable"
    android_drawable.mkdir(parents=True, exist_ok=True)
    splash_android = android_drawable / "splash.png"
    img_small = img.resize((1080, 1080), Image.LANCZOS)
    save_png(img_small, splash_android)

    print(f"\nNote: Wire Splash.png into LaunchScreen.storyboard in Xcode.")


if __name__ == "__main__":
    print("Longevify icon generator")
    print(f"Output root: {MOBILE_DIR}")
    generate_ios_icons()
    generate_android_icons()
    generate_splash()
    print("\nDone! All icons generated.")
    print("Next: open Xcode, verify icons in Assets.xcassets.")
