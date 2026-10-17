"""
Every size of the ana mark, from the three masters in design/brand (ribbon-a-light, -dark, -flat).
Run from the repo root:  python3 scripts/make-icons.py   (needs Pillow)
Writes public/icons, public/brand, public/splash, public/og.png, src/app/favicon.ico and
src/lib/launch-screens.ts.
"""
import json
from PIL import Image, ImageDraw, ImageFilter
src, pub, app = "design/brand", "public", "src/app"
CREAM, NIGHT = (251, 248, 242), (19, 18, 14)
TEAL, TEAL_D = (47, 107, 94), (125, 191, 174)

def trimmed(name):
    im = Image.open(f"{src}/{name}.png").convert("RGBA")
    im.putalpha(im.split()[3].point(lambda v: 0 if v < 12 else v))
    im = im.crop(im.getbbox())
    s = max(im.size)
    sq = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    sq.paste(im, ((s - im.size[0]) // 2, (s - im.size[1]) // 2), im)
    return sq

def put(canvas, mark, scale, cx=0.5, cy=0.5):
    w = round(min(canvas.size) * scale)
    m = mark.resize((w, w), Image.LANCZOS)
    canvas.alpha_composite(m, (round(canvas.size[0] * cx - w / 2), round(canvas.size[1] * cy - w / 2)))
    return canvas

def tile(mark, size, scale, bg=CREAM):
    return put(Image.new("RGBA", (size, size), bg + (255,)), mark, scale)

def solid(mark, colour):
    out = Image.new("RGBA", mark.size, colour + (255,))
    out.putalpha(mark.split()[3])
    return out

def clear(mark, size, scale=1.0):
    return put(Image.new("RGBA", (size, size), (0, 0, 0, 0)), mark, scale)

L, D, F = trimmed("ribbon-a-light"), trimmed("ribbon-a-dark"), trimmed("ribbon-a-flat")
I = f"{pub}/icons"
made = []
def save(im, path, **kw):
    if "apple" in path:
        im = im.convert("RGB")
    im.save(path, optimize=True, **kw)
    made.append(path.replace(pub, ""))

# Browser tabs: the flat shape (gradients turn to mush at 16-32 px).
for s in (16, 32, 48):
    save(clear(solid(F, TEAL), s), f"{I}/favicon-{s}.png")
    save(clear(solid(F, TEAL_D), s), f"{I}/favicon-dark-{s}.png")
save(clear(solid(F, TEAL), 32), f"{pub}/favicon.png")          # kept at its old address too
clear(solid(F, TEAL), 256).save(f"{app}/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])

# Apple home screen: the glossy mark on a full cream square (iOS rounds the corners).
for s in (120, 152, 167, 180):
    save(tile(L, s, 0.70), f"{I}/apple-touch-icon-{s}.png")
save(tile(L, 180, 0.70), f"{I}/apple-touch-icon.png")

# Android / desktop install.
for s in (96, 144, 192, 512):
    save(tile(L, s, 0.70), f"{I}/icon-{s}.png")
for s in (192, 512):
    save(tile(L, s, 0.56), f"{I}/maskable-{s}.png")              # inside the 80% safe circle
save(clear(solid(F, (255, 255, 255)), 512, 0.62), f"{I}/monochrome-512.png")  # themed icons read only the shape

# Notifications: Android tints the badge, so only its shape counts.
save(clear(solid(F, (255, 255, 255)), 96, 0.88), f"{I}/badge-96.png")

# In-app mark.
for n, im in (("light", L), ("dark", D)):
    im.resize((256, 256), Image.LANCZOS).save(f"{pub}/brand/mark-{n}.webp", quality=92, method=6)
    im.resize((1024, 1024), Image.LANCZOS).save(f"{pub}/brand/mark-{n}.png", optimize=True)
solid(F, TEAL).resize((1024, 1024), Image.LANCZOS).save(f"{pub}/brand/mark-flat.png", optimize=True)

# Link preview, 1200 x 630: the mark on the base card (name and line already on it).
def ground(w, h, bg, glow, strength):
    g = Image.new("RGB", (w, h), bg)
    halo = Image.new("L", (w, h), 0)
    ImageDraw.Draw(halo).ellipse((w * 0.2, h * 0.275, w * 0.8, h * 0.725), fill=255)
    halo = halo.filter(ImageFilter.GaussianBlur(min(w, h) * 0.18))
    tint = Image.new("RGB", (w, h), tuple(round(bg[i] + (glow[i] - bg[i]) * strength) for i in range(3)))
    return Image.composite(tint, g, halo).convert("RGBA")

og = Image.open(f"{src}/og-base.png").convert("RGB")
og = og.convert("RGBA")
og.alpha_composite(L.resize((190, 190), Image.LANCZOS), ((1200 - 190) // 2, 125))
save(og.convert("RGB"), f"{pub}/og.png")

# iPhone / iPad launch screens (home-screen app), light and dark: the splash's own ground
# (paper with a faint teal glow), so the app opens straight into its splash.
DEVICES = [  # css width, css height, pixel ratio
    (375, 667, 2), (414, 736, 3), (375, 812, 3), (414, 896, 2), (414, 896, 3), (390, 844, 3),
    (428, 926, 3), (393, 852, 3), (430, 932, 3), (402, 874, 3), (440, 956, 3),
    (744, 1133, 2), (768, 1024, 2), (810, 1080, 2), (820, 1180, 2), (834, 1194, 2), (1024, 1366, 2),
]
startup = []
for w, h, r in DEVICES:
    W, H = w * r, h * r
    for theme, bg, mark, glow in (("light", CREAM, L, TEAL), ("dark", NIGHT, D, TEAL_D)):
        g = ground(W, H, bg, glow, 0.10)
        # No mark: the app's own splash (lotus and snake) appears on this same ground next.
        name = f"/splash/launch-{W}x{H}-{theme}.png"
        g.convert("RGB").save(pub + name, optimize=True)
        startup.append({"url": name, "media": f"(device-width: {w}px) and (device-height: {h}px) and (-webkit-device-pixel-ratio: {r}) and (orientation: portrait) and (prefers-color-scheme: {theme})"})
ts = ["/**", " * iPhone and iPad launch screens for the home-screen app (portrait, light and dark): the splash's",
      " * own ground, so the app opens straight into its splash. Written by scripts/make-icons.py.", " */",
      "export const LAUNCH_SCREENS: { url: string; media: string }[] = ["]
ts += [f'  {{ url: "{x["url"]}", media: "{x["media"]}" }},' for x in startup]
open("src/lib/launch-screens.ts", "w").write("\n".join(ts + ["];", ""]))
print(len(made), "icons;", len(startup), "launch screens")
