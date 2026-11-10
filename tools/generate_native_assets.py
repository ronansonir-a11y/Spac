"""Regenerate the original AETHER-6 icon and native splash screens (requires Pillow)."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import math

ROOT = Path(__file__).resolve().parents[1] / 'android/app/src/main/res'
CYAN = (98, 235, 219, 255)
BG = (2, 8, 14, 255)

def emblem(size=512):
    image = Image.new('RGBA', (size, size), BG)
    d = ImageDraw.Draw(image)
    s = size / 512
    d.ellipse((42*s, 42*s, 470*s, 470*s), outline=(42, 94, 94, 255), width=max(1, int(2*s)))
    d.arc((70*s, 70*s, 442*s, 442*s), 210, 340, fill=(63, 137, 132, 255), width=max(1, int(3*s)))
    for x, y in [(72, 147), (415, 365), (385, 93), (105, 389)]:
        r = 2*s; d.ellipse((x*s-r, y*s-r, x*s+r, y*s+r), fill=CYAN)
    d.polygon([(256*s, 78*s), (401*s, 407*s), (256*s, 344*s), (111*s, 407*s)], outline=CYAN, width=max(2, int(13*s)))
    d.polygon([(256*s, 148*s), (316*s, 315*s), (256*s, 286*s), (196*s, 315*s)], fill=CYAN)
    return image

icon = emblem()
for folder in ROOT.glob('mipmap-*'):
    if not folder.is_dir() or folder.name == 'mipmap-anydpi-v26': continue
    size = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}.get(folder.name.split('-')[-1], 192)
    for name in ['ic_launcher.png', 'ic_launcher_round.png']:
        icon.resize((size, size), Image.Resampling.LANCZOS).save(folder / name)
    foreground = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    small = emblem(size).resize((size, size))
    foreground.alpha_composite(small)
    foreground.save(folder / 'ic_launcher_foreground.png')

try:
    font_path = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
    light_path = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
except Exception:
    font_path = light_path = None

for path in list(ROOT.glob('drawable*/splash.png')):
    with Image.open(path) as old: w, h = old.size
    image = Image.new('RGBA', (w, h), BG)
    image.alpha_composite(emblem(min(w, h)).resize((int(min(w,h)*.36),)*2, Image.Resampling.LANCZOS), (int(w*.5-min(w,h)*.18), int(h*.4-min(w,h)*.18)))
    d = ImageDraw.Draw(image)
    title_size = max(20, int(min(w,h)*.075)); small_size = max(7, int(min(w,h)*.015))
    title = ImageFont.truetype(light_path, title_size) if light_path else ImageFont.load_default()
    small = ImageFont.truetype(font_path, small_size) if font_path else ImageFont.load_default()
    d.text((w/2, h*.72), 'A E T H E R — 6', font=title, fill=(220, 255, 249), anchor='mm')
    d.text((w/2, h*.79), 'D E E P  S P A C E  F L I G H T  P R O G R A M', font=small, fill=CYAN, anchor='mm')
    image.convert('RGB').save(path)
print('Native AETHER-6 icons and splash screens generated.')
