"""Rasterise world land (world-atlas land-110m, Natural Earth) into a dotted-map SVG, equirectangular.

Usage: python3 -I dots.py <land-110m.json> <out.svg>
viewBox is 0 0 1000 500 (lon -180..180, lat 90..-90); the hero crops it to the inhabited band.
"""

import json
import sys

src, out = sys.argv[1:3]
topo = json.load(open(src))
sx, sy = topo["transform"]["scale"]
tx, ty = topo["transform"]["translate"]

# decode delta-encoded, quantised arcs
arcs = []
for arc in topo["arcs"]:
    x = y = 0
    pts = []
    for dx, dy in arc:
        x += dx
        y += dy
        pts.append((x * sx + tx, y * sy + ty))
    arcs.append(pts)


def ring(indexes):
    pts = []
    for i in indexes:
        a = arcs[i] if i >= 0 else arcs[~i][::-1]
        pts.extend(a if not pts else a[1:])
    return pts


polys = []
for geom in topo["objects"]["land"]["geometries"]:
    shapes = geom["arcs"] if geom["type"] == "MultiPolygon" else [geom["arcs"]]
    for shape in shapes:
        polys.append([ring(r) for r in shape])

# bounding boxes for a quick reject
boxes = []
for p in polys:
    xs = [x for x, _ in p[0]]
    ys = [y for _, y in p[0]]
    boxes.append((min(xs), max(xs), min(ys), max(ys)))


def inside(r, x, y):
    c = False
    n = len(r)
    j = n - 1
    for i in range(n):
        xi, yi = r[i]
        xj, yj = r[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            c = not c
        j = i
    return c


def land(lon, lat):
    for p, (x0, x1, y0, y1) in zip(polys, boxes):
        if x0 <= lon <= x1 and y0 <= lat <= y1 and inside(p[0], lon, lat):
            if not any(inside(h, lon, lat) for h in p[1:]):
                return True
    return False


STEP = 2.6  # degrees between dots
dots = []
lat = 84.0
while lat > -60:
    lon = -180 + STEP / 2
    while lon < 180:
        if land(lon, lat):
            dots.append(((lon + 180) / 360 * 1000, (90 - lat) / 180 * 500))
        lon += STEP
    lat -= STEP

r = 1.55
body = "".join(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r}"/>' for x, y in dots)
svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 500"><g fill="#121416">{body}</g></svg>'
open(out, "w").write(svg)
print(len(dots), "dots,", len(svg) // 1024, "KB")
