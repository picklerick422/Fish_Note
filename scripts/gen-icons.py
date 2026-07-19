#!/usr/bin/env python3
"""生成鱼记鸿蒙图标：#4A6FA5 背景 + 白色几何鱼（背鳍版），覆盖现有 PNG（尺寸不变）。"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
BRAND = (74, 111, 165, 255)      # #4A6FA5
BRAND_DARK = (47, 74, 115, 255)  # #2F4A73
WHITE = (255, 255, 255, 255)

TARGETS = [
    "harmony/AppScope/resources/base/media/background.png",
    "harmony/AppScope/resources/base/media/foreground.png",
    "harmony/entry/src/main/resources/base/media/background.png",
    "harmony/entry/src/main/resources/base/media/foreground.png",
    "harmony/entry/src/main/resources/base/media/startIcon.png",
]


def draw_fish(draw: ImageDraw.ImageDraw, cx: float, cy: float, s: float, body, fin, eye=None):
    """cx,cy 为鱼身中心，s 为鱼身半宽。eye=None 时不画眼睛（前景图用）。"""
    # 尾鳍
    draw.polygon([(cx + s * 0.5, cy), (cx + s * 1.15, cy - s * 0.66), (cx + s * 1.15, cy + s * 0.66)], fill=fin)
    # 背鳍
    draw.polygon([(cx - s * 0.1, cy - s * 0.5), (cx + s * 0.08, cy - s * 1.05), (cx + s * 0.34, cy - s * 0.42)], fill=fin)
    # 鱼身
    draw.ellipse([cx - s, cy - s * 0.68, cx + s * 0.6, cy + s * 0.68], fill=body)
    if eye:
        r = s * 0.11
        ex, ey = cx - s * 0.52, cy - s * 0.14
        draw.ellipse([ex - r, ey - r, ex + r, ey + r], fill=eye)


def gen_background(path: Path):
    img = Image.open(path)
    bg = Image.new("RGBA", img.size, BRAND)
    bg.save(path)
    print(f"background {img.size} -> {path}")


def gen_foreground(path: Path):
    img = Image.open(path)
    w, h = img.size
    fg = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(fg)
    s = w * 0.22  # 鱼身半宽：整体约占图标 55%
    draw_fish(d, w * 0.46, h * 0.5, s, WHITE, WHITE)
    fg.save(path)
    print(f"foreground {img.size} -> {path}")


def gen_start_icon(path: Path):
    img = Image.open(path)
    w, h = img.size
    icon = Image.new("RGBA", (w, h), BRAND)
    d = ImageDraw.Draw(icon)
    s = w * 0.24
    draw_fish(d, w * 0.46, h * 0.52, s, WHITE, WHITE, eye=BRAND_DARK)
    icon.save(path)
    print(f"startIcon {img.size} -> {path}")


def main():
    for rel in TARGETS:
        path = ROOT / rel
        if not path.exists():
            print(f"SKIP (不存在): {rel}", file=sys.stderr)
            continue
        if "background" in path.name:
            gen_background(path)
        elif "foreground" in path.name:
            gen_foreground(path)
        else:
            gen_start_icon(path)


if __name__ == "__main__":
    main()
