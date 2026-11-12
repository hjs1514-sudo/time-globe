# Canva 그림(흰 배경)을 오려 앱에 넣는다. 사용: python3 tools/cutout.py <tms.png> <thief.png> <hero.png>
# 타임머신 시트는 3x2 로 잘라 tm0~tm5, 시간 도둑은 thief.png, 시작 화면은 hero.jpg
import sys
from PIL import Image, ImageDraw, ImageFilter
def cut(im, tol=42):
    im = im.convert('RGBA'); w, h = im.size
    mask = Image.new('L', (w + 2, h + 2), 0)
    rgb = im.convert('RGB')
    for xy in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2)]:
        if min(rgb.getpixel(xy)) > 225:
            ImageDraw.floodfill(rgb, xy, (255, 0, 255), thresh=tol)
    px = rgb.load(); a = Image.new('L', (w, h), 255); ap = a.load()
    for y in range(h):
        for x in range(w):
            if px[x, y] == (255, 0, 255): ap[x, y] = 0
    a = a.filter(ImageFilter.GaussianBlur(0.6))
    im.putalpha(a); return im.crop(im.getbbox())
tms, thief, hero = sys.argv[1:4]
out = 'public/img/'
im = Image.open(tms); w, h = im.size
for i in range(6):
    c, r = i % 3, i // 3
    t = cut(im.crop((c * w // 3, [0, int(h * 0.487)][r], (c + 1) * w // 3, [int(h * 0.487), h][r])))
    t.thumbnail((256, 256)); t.save(f'{out}tm{i}.png')
t = cut(Image.open(thief)); t.thumbnail((400, 400)); t.save(out + 'thief.png')
hi = Image.open(hero).convert('RGB'); hi.thumbnail((1920, 1080)); hi.save(out + 'hero.jpg', quality=85)
print('ok')
