"""Georeference 1881 Hopkins Plates 3 + 5 into one north-up map of Euclid & Case (E. 40th).

Each plate gets its own affine transform, solved by least squares from four street control points, into a shared
frame where Euclid Avenue is a straight horizontal line and Case Avenue a vertical one crossing it
at the image centre. Plate 3 supplies everything west of Case, Plate 5 everything east, so the
seam runs exactly along the Case centreline and both streets continue straight across it.

The plates disagree slightly with each other (Case meets Euclid at ~93° on Plate 3, ~88° on
Plate 5; the Euclid-to-Prospect lot depth differs by ~5%) — ordinary engraving distortion. The
affine fits absorb it, refined against street lines measured on both sides of the seam (see FIX3 /
FIX5); the lot depth uses the mean of the two plates. Scale ≈ 0.40–0.41 m/px, from the
plates' 200 ft/inch scale bars.

usage: compose_plate.py plate3.jpg plate5.jpg out.jpg
"""
import sys
import numpy as np
from PIL import Image

W, H = 2000, 1400
C = np.array([W / 2, H / 2])  # Euclid × Case in the output

# control points in each source plate (full-resolution pixels)
P3 = {'case': (3560, 2090), 'prospect': (3458, 2405), 'euclid_w': (2450, 1925), 'case_n': (3600, 1700)}
P5 = {'case': (2540, 1620), 'prospect': (2905, 1572), 'euclid_e': (2420, 850), 'case_n': (2150, 1675)}

def dist(a, b):
    return float(np.hypot(a[0] - b[0], a[1] - b[1]))

DEPTH = (dist(P3['case'], P3['prospect']) + dist(P5['case'], P5['prospect'])) / 2  # Euclid→Prospect

def affine(src_pts, dst_pts):
    """2×3 matrix mapping src → dst, least squares over the point pairs."""
    A, b = [], []
    for (x, y), (u, v) in zip(src_pts, dst_pts):
        A.append([x, y, 1, 0, 0, 0]); b.append(u)
        A.append([0, 0, 0, x, y, 1]); b.append(v)
    m = np.linalg.lstsq(np.array(A, float), np.array(b, float), rcond=None)[0]
    return m.reshape(2, 3)

NORTH = (dist(P3['case'], P3['case_n']) + dist(P5['case'], P5['case_n'])) / 2
M3 = affine(
    [P3['case'], P3['prospect'], P3['euclid_w'], P3['case_n']],
    [C, C + [0, DEPTH], C - [dist(P3['case'], P3['euclid_w']), 0], C - [0, NORTH]],
)
M5 = affine(
    [P5['case'], P5['prospect'], P5['euclid_e'], P5['case_n']],
    [C, C + [0, DEPTH], C + [dist(P5['case'], P5['euclid_e']), 0], C - [0, NORTH]],
)


# Refinement. The four-point fits above left Euclid tilted ~1.7° (falling to the east) on both
# plates, Case sheared on Plate 3, a ~20 px step in Euclid and Prospect at the seam, and the whole
# sheet ~(12, 9) px off the street frame. These are line positions measured on that first composite
# (darkness profiles across each street), each pulled to where the street frame puts it. An E–W
# line point fixes y only ('v'); a N–S line point fixes x only ('u'). Both plates get the same
# targets, so they meet at the seam.
#
# Targets come from the engraving itself at the scale bar's 0.40 m/px: Euclid's lot lines are
# 74 px apart (99 ft, as the plate annotates) and Case's 46 px (60 ft), so Euclid's centreline lands
# on y = 700 and Case's on x = 1000, the 3D street's frame.
EUC_N = 700 - 37       # Euclid north lot line
EUC_K = EUC_N + 54     # the strong line 54 px south of it (south kerb; the south lot line is at +74)
PROS_C, PROS_H = 1052, 14  # Prospect: centre (mean Euclid→Prospect depth of both plates) and half width
CASE_W = 1000 - 23     # Case west lot line
CASE_S = 1000 - 1      # Case sewer line (Plate 5 side; the east lot line is at +23)
FIX3 = [('v', x, y, EUC_N) for x, y in [(520, 663), (720, 670), (950, 677)]] + \
       [('v', x, y, EUC_K) for x, y in [(520, 719), (720, 726), (950, 732)]] + \
       [('v', x, y, PROS_C - PROS_H) for x, y in [(520, 1049), (720, 1055), (950, 1061)]] + \
       [('v', x, y, PROS_C + PROS_H) for x, y in [(520, 1080), (720, 1085), (950, 1090)]] + \
       [('u', x, y, CASE_W) for x, y in [(980, 425), (984, 600), (990, 815), (994, 965), (1001, 1200)]]
FIX5 = [('v', x, y, EUC_N) for x, y in [(1050, 657), (1280, 663), (1520, 669)]] + \
       [('v', x, y, EUC_K) for x, y in [(1050, 709), (1280, 714), (1520, 720)]] + \
       [('v', x, y, PROS_C - PROS_H) for x, y in [(1050, 1021), (1280, 1028)]] + \
       [('v', x, y, PROS_C + PROS_H) for x, y in [(1050, 1047), (1280, 1054)]] + \
       [('u', x, y, CASE_S) for x, y in [(1008, 425), (1009, 600), (1011, 815), (1012, 965), (1014, 1200)]]


def refine(fixes):
    """Correction K (3×3) in output space: y' = a·y + c·x + b (level + depth), x' = x + f·(y − 700) + e (shear + offset)."""
    vs = [(x, y, t) for k, x, y, t in fixes if k == 'v']
    us = [(x, y, t) for k, x, y, t in fixes if k == 'u']
    a, c, b = np.linalg.lstsq(np.array([[y, x, 1] for x, y, _ in vs], float), np.array([t for *_, t in vs], float), rcond=None)[0]
    f, e = np.linalg.lstsq(np.array([[y - 700, 1] for x, y, _ in us], float), np.array([t - x for x, y, t in us], float), rcond=None)[0]
    return np.array([[1, f, e - 700 * f], [c, a, b], [0, 0, 1]])


K3, K5 = refine(FIX3), refine(FIX5)
M3 = (K3 @ np.vstack([M3, [0, 0, 1]]))[:2]
M5 = (K5 @ np.vstack([M5, [0, 0, 1]]))[:2]


def apply(M, p):
    return M @ np.array([p[0], p[1], 1.0])

def warp(img, M):
    # PIL wants the inverse map (output → input)
    full = np.vstack([M, [0, 0, 1]])
    inv = np.linalg.inv(full)
    return img.transform((W, H), Image.AFFINE, tuple(inv[:2].ravel()), resample=Image.BICUBIC, fillcolor=(240, 214, 180))

if __name__ == '__main__':
    p3 = Image.open(sys.argv[1]).convert('RGB')
    p5 = Image.open(sys.argv[2]).convert('RGB')
    a = warp(p3, M3)
    b = warp(p5, M5)
    # seam along the Case centreline (x = W/2): Plate 3 to the west, Plate 5 to the east
    out = a.copy()
    out.paste(b.crop((int(C[0]), 0, W, H)), (int(C[0]), 0))
    out.save(sys.argv[3], quality=90)
    print('ok', sys.argv[3], 'depth', round(DEPTH, 1))
