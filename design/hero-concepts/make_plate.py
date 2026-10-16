"""Turn the approved hero mockup into a clean background plate.

Removes the baked-in header (by cropping), the copy, the plinth labels and the three AI shoes.
  1. Prefill every hole from its own surface (pull-push), so no shoe or text colour can leak into later steps.
  2. Plinth holes: clone plaster texture from the same plinth a little higher up, Poisson-blended (sparse solve)
     so its colour meets the surrounding face seamlessly.
  3. Wall holes: Poisson with a flat source = a harmonic fill, which keeps the soft sun-beam gradients continuous.
  4. Fine grain measured from the untouched wall is added back so filled areas don't look airbrushed.
The window light, sun beams and cast shadows outside the holes are untouched.

Usage: python3 make_plate.py <mockup.png> <out.jpg> <debug-mask.png>
"""

import sys

import cv2
import numpy as np
import scipy.sparse as sp
import scipy.sparse.linalg as spla

src, out, dbg = sys.argv[1:4]
orig = cv2.imread(src, cv2.IMREAD_COLOR)
img = orig.astype(np.float32)
H, W = img.shape[:2]

# --- surfaces (original mockup coordinates) --------------------------------------------------------------------
WALL, WOMEN, MEN, KIDS = 0, 1, 2, 3
surface = np.full((H, W), WALL, np.uint8)
surface[619:880, 831:1065] = WOMEN
surface[524:860, 1063:1316] = MEN
surface[645:895, 1232:1488] = KIDS  # stands in front of the men's plinth

# --- holes: (x0, y0, x1, y1, how far up to clone plaster from, or None for a smooth fill) ----------------------
HOLES = [
    # copy on the wall
    (103, 196, 498, 229, None),
    (103, 231, 875, 400, None),
    (100, 406, 432, 488, None),
    (438, 426, 634, 472, None),
    (103, 490, 803, 530, None),
    # plinth labels: plaster from ~80 px higher on the same face
    (850, 806, 990, 862, 84),
    (1096, 785, 1231, 839, 80),
    (1276, 821, 1434, 876, 84),
    # the shoes
    (846, 470, 1036, 630, None),
    (1082, 375, 1286, 532, None),
    (1270, 530, 1437, 658, None),
]
hole = np.zeros((H, W), bool)
for x0, y0, x1, y1, _ in HOLES:
    hole[y0:y1, x0:x1] = True
hole = cv2.dilate(hole.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0


# --- 1. pull-push prefill, per surface -----------------------------------------------------------------------------
def pull_push(image: np.ndarray, weight: np.ndarray) -> np.ndarray:
    """Smoothly fill pixels with weight 0 from those with weight 1 (image pyramid, coarse values pushed down)."""
    levels = [(image * weight[..., None], weight)]
    while min(levels[-1][1].shape) > 4:
        p, w = levels[-1]
        levels.append((cv2.pyrDown(p), cv2.pyrDown(w)))
    p, w = levels[-1]
    cur = p / np.maximum(w, 1e-6)[..., None]
    for p, w in reversed(levels[:-1]):
        up = cv2.resize(cur, (w.shape[1], w.shape[0]), interpolation=cv2.INTER_LINEAR)
        a = np.clip(w * 2, 0, 1)[..., None]
        cur = a * (p / np.maximum(w, 1e-6)[..., None]) + (1 - a) * up
    return cur


work = img.copy()
for cls in (WALL, WOMEN, MEN, KIDS):
    target = hole & (surface == cls)
    if not target.any():
        continue
    valid = ((~hole) & (surface == cls)).astype(np.float32)
    filled = pull_push(img, valid)
    work[target] = filled[target]
work8 = np.clip(work, 0, 255).astype(np.uint8)


# --- 2 + 3. Poisson passes, one per hole and surface (plinths first, the wall last) ----------------------------------
def poisson(dst: np.ndarray, source: np.ndarray, region: np.ndarray, cls: int) -> np.ndarray:
    """Solve lap(f) = lap(source) inside `region`, f = dst on borders of the same surface; borders with another
    surface (a plinth edge) are left free (zero flux), so a fill never blends across an edge. Exact sparse solve."""
    ys, xs = np.nonzero(region)
    idx = -np.ones(region.shape, np.int64)
    idx[ys, xs] = np.arange(len(ys))
    n = len(ys)
    rows, cols, vals = [], [], []
    out = dst.astype(np.float64).copy()
    srcf = source.astype(np.float64)
    b = np.zeros((n, 3))
    diag = np.zeros(n)
    for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
        ny, nx = ys + dy, xs + dx
        inside = idx[ny, nx] >= 0
        same = surface[ny, nx] == cls
        use = inside | same  # neighbours on another surface are dropped (zero flux)
        diag += use
        rows.append(np.arange(n)[inside])
        cols.append(idx[ny, nx][inside])
        vals.append(-np.ones(inside.sum()))
        border = (~inside) & same  # known neighbours: move them to the right-hand side
        b[border] += out[ny[border], nx[border]]
        b[use] += srcf[ys[use], xs[use]] - srcf[ny[use], nx[use]]  # the source's gradients (zero when flat)
    rows.append(np.arange(n)); cols.append(np.arange(n)); vals.append(diag)
    A = sp.csr_matrix((np.concatenate(vals), (np.concatenate(rows), np.concatenate(cols))), shape=(n, n))
    solve = spla.factorized(A.tocsc())
    for c in range(3):
        out[ys, xs, c] = solve(b[:, c])
    return np.clip(out, 0, 255).astype(np.uint8)


order = sorted(range(len(HOLES)), key=lambda i: HOLES[i][4] is None)
for cls in (WOMEN, MEN, KIDS, WALL):
    for i in order:
        x0, y0, x1, y1, lift = HOLES[i]
        box = np.zeros((H, W), bool)
        box[max(0, y0 - 3) : y1 + 3, max(0, x0 - 3) : x1 + 3] = True
        region = hole & box & (surface == cls)
        if region.sum() < 30:
            continue
        if lift is not None and cls != WALL:
            source = np.roll(orig, lift, axis=0)  # plaster from higher up on the same face
        else:
            source = np.full_like(work8, 128)  # flat: a harmonic fill
        work8 = poisson(work8, source, region, cls)

# --- 4. grain ------------------------------------------------------------------------------------------------------
wall_ref = img[545:600, 690:820]  # clean wall between the copy and the plinths
hp = wall_ref - cv2.GaussianBlur(wall_ref, (0, 0), 1.2)
sd = float(hp.std())
rng = np.random.default_rng(7)
grain = rng.normal(0, 1, img.shape).astype(np.float32)
grain = grain - cv2.GaussianBlur(grain, (0, 0), 1.2)
grain *= sd / max(float(grain.std()), 1e-6)
result = work8.astype(np.float32)
smooth_holes = hole.copy()
for x0, y0, x1, y1, lift in HOLES:
    if lift is not None:
        smooth_holes[y0:y1, x0:x1] = False  # cloned plaster already carries real texture
result[smooth_holes] += grain[smooth_holes]

# --- crop the baked-in header and save -----------------------------------------------------------------------------
TOP = 120
plate = np.clip(result[TOP:], 0, 255).astype(np.uint8)
cv2.imwrite(out, plate, [cv2.IMWRITE_JPEG_QUALITY, 94])
cv2.imwrite(dbg, (hole[TOP:] * 255).astype(np.uint8))
print("plate", plate.shape[1], "x", plate.shape[0], "grain sd", round(sd, 2))
