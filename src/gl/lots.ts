import * as THREE from 'three';
import { LOTS, PLATE } from '../data/site';

// The Atlas's lots as an id texture over the plate: each lot's pixels hold red = (index + 1) × 20,
// so the ground shader can hatch the hovered one in. Written pixel by pixel, not drawn: a canvas
// fill antialiases its edges, and a half-blended edge of one lot can land on another lot's id
// (that lit up a strip across Euclid when a Wade lot was hovered). Half the plate's resolution.
export function makeLotTexture() {
  const W = PLATE.widthPx / 2, H = PLATE.heightPx / 2;
  const data = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = lotAt(x * 2 + 1, y * 2 + 1);
      // DataTexture rows run bottom-up; the plate's image (and its UVs) top-down
      const o = ((H - 1 - y) * W + x) * 4;
      data[o] = i < 0 ? 0 : (i + 1) * 20;
      data[o + 3] = 255;
    }
  }
  const t = new THREE.DataTexture(data, W, H);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}

// which lot a plate pixel falls in (−1: none)
export function lotAt(px: number, py: number) {
  return LOTS.findIndex(({ poly }) => {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  });
}

// a lot's centre in world metres (x, z), clipped to the plate for the north lots that run off it
export function lotCentre(i: number): [number, number] {
  const p = LOTS[i].poly;
  const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  // north lots: frame the built front of the lot, not the whole 270 m run
  const y0 = Math.min(...ys), y1 = Math.max(...ys);
  const cy = y1 - y0 > 400 ? y1 - 200 : (y0 + y1) / 2;
  return [(cx - PLATE.widthPx / 2) * PLATE.metresPerPx, (cy - PLATE.heightPx / 2) * PLATE.metresPerPx];
}
