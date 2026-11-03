#!/usr/bin/env python3
"""Generate the WAZI logo set (SVG + PNG). Requires: pip install cairosvg

    python3 branding/make_icons.py

Concept: "wazi" = open/vacant. A house with its door swung open and light spilling out,
sitting inside the five-axis amenity radar (school, hospital, road, police, industry).
"""
import math, pathlib
import cairosvg

HERE = pathlib.Path(__file__).resolve().parent
ICON_DIR = HERE.parent / "mobile" / "assets" / "icon"

GREEN, GREEN_DARK, GREEN_LIGHT = "#2F6F4E", "#1F4E37", "#3B8A62"
CREAM, CARD, AMBER, RUST = "#FFFDF6", "#F7F3E8", "#E3A72E", "#B8631F"

CX, CY, R = 256, 262, 140   # radar centre / radius, in a 512 box

def pent(r, cx=CX, cy=CY):
    return [(cx + r * math.cos(math.radians(a)), cy + r * math.sin(math.radians(a)))
            for a in (-90, -18, 54, 126, 198)]

def pts(p):
    return " ".join(f"{x:.1f},{y:.1f}" for x, y in p)

def glyph(mono=False):
    """The mark itself, drawn inside the adaptive-icon safe zone (radius ~150 about 256,256)."""
    outer, inner = pent(R), pent(R * 0.52)
    c_main = "#FFFFFF" if mono else CREAM
    c_door = "#FFFFFF" if mono else AMBER
    parts = [
        f'<polygon points="{pts(outer)}" fill="{c_main}" fill-opacity="0.08" stroke="{c_main}" stroke-opacity="0.55" stroke-width="5" stroke-linejoin="round"/>',
        f'<polygon points="{pts(inner)}" fill="none" stroke="{c_main}" stroke-opacity="0.28" stroke-width="3" stroke-linejoin="round"/>',
    ]
    parts += [f'<line x1="{CX}" y1="{CY}" x2="{x:.1f}" y2="{y:.1f}" stroke="{c_main}" stroke-opacity="0.18" stroke-width="3"/>' for x, y in outer]
    # house (scaled up inside the radar so the open door stays legible at small sizes)
    parts.append('<g transform="translate(256 320) scale(1.16) translate(-256 -320)">')
    # light spilling from the open door
    parts.append(f'<polygon points="240,330 272,330 300,352 222,352" fill="{c_main}" fill-opacity="0.30"/>')
    # house: roof, body, open door
    parts.append(f'<polygon points="184,264 256,188 328,264" fill="{c_main}" stroke="{c_main}" stroke-width="12" stroke-linejoin="round"/>')
    parts.append(f'<rect x="206" y="258" width="100" height="72" rx="6" fill="{"#FFFFFF" if mono else CARD}"/>')
    parts.append(f'<path d="M240 330 V288 a6 6 0 0 1 6 -6 h20 a6 6 0 0 1 6 6 V330 Z" fill="{GREEN_DARK if not mono else "#000000"}"/>')
    parts.append(f'<path d="M244 330 V290 a4 4 0 0 1 4 -4 h16 a4 4 0 0 1 4 4 V330 Z" fill="{c_door}"/>')
    parts.append(f'<polygon points="244,286 224,294 224,334 244,330" fill="{RUST if not mono else "#000000"}"/>')
    parts.append('</g>')
    # amenity dots on the radar vertices
    for x, y in outer:
        parts.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="12" fill="{c_door}" stroke="{GREEN_DARK if not mono else "#000000"}" stroke-width="4"/>')
    return "\n    ".join(parts)

def svg(kind):
    defs = f'''<defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="{GREEN_LIGHT}"/><stop offset="1" stop-color="{GREEN_DARK}"/>
    </linearGradient>
  </defs>'''
    head = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">'
    if kind == "icon":      # full icon: rounded square, glyph scaled up to fill it
        body = f'<rect width="512" height="512" rx="112" fill="url(#bg)"/>\n  <g transform="translate(256 256) scale(1.2) translate(-256 -256)">\n    {glyph()}\n  </g>'
    elif kind == "foreground":  # adaptive-icon foreground: transparent, glyph inside safe zone
        body = f'<g>\n    {glyph()}\n  </g>'
    elif kind == "background":  # adaptive-icon background: full-bleed gradient
        body = '<rect width="512" height="512" fill="url(#bg)"/>'
    else:
        raise ValueError(kind)
    return f"{head}\n  {defs}\n  {body}\n</svg>\n"

def write(name, kind, px=None):
    s = svg(kind)
    (HERE / f"{name}.svg").write_text(s, encoding="utf-8")
    if px:
        cairosvg.svg2png(bytestring=s.encode(), write_to=str(ICON_DIR / f"{name}_{px}.png"), output_width=px, output_height=px)

if __name__ == "__main__":
    ICON_DIR.mkdir(parents=True, exist_ok=True)
    write("wazi_icon", "icon", 1024)
    write("wazi_icon_foreground", "foreground", 1024)
    write("wazi_icon_background", "background", 1024)
    # 512px copy for the in-app splash / auth screens
    cairosvg.svg2png(bytestring=svg("icon").encode(), write_to=str(ICON_DIR / "wazi_logo_512.png"), output_width=512, output_height=512)
    # web favicon = the full icon
    (HERE / "favicon.svg").write_text(svg("icon"), encoding="utf-8")
    print("wrote", sorted(p.name for p in HERE.iterdir() if p.suffix == ".svg"), sorted(p.name for p in ICON_DIR.iterdir()))
