"""Georeference 1881 Hopkins Plates 3 + 5 into one north-up map of Euclid & Case (E. 40th).

Each plate gets its own affine transform, solved by least squares from four street control points, into a shared
frame where Euclid Avenue is a straight horizontal line and Case Avenue a vertical one crossing it
at the image centre. Plate 3 supplies everything west of Case, Plate 5 everything east, so the
seam runs exactly along the Case centreline and both streets continue straight across it.

The plates disagree slightly with each other (Case meets Euclid at ~93° on Plate 3, ~88° on
Plate 5; the Euclid-to-Prospect lot depth differs by ~10%) — ordinary engraving distortion. The
affine fit absorbs it; the lot depth uses the mean of the two plates. Scale ≈ 0.41 m/px, from the
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
