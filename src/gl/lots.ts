import * as THREE from 'three';
import { LOTS, PLATE } from '../data/site';

// The Atlas's lots as an id texture over the plate: each lot filled with red = (index + 1) × 20,
// so the ground shader can hatch the hovered one in. Half the plate's resolution is plenty.
export function makeLotTexture() {
  const W = PLATE.widthPx / 2, H = PLATE.heightPx / 2;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  g.fillStyle = '#000';
  g.fillRect(0, 0, W, H);
  LOTS.forEach((lot, i) => {
    g.fillStyle = `rgb(${(i + 1) * 20},0,0)`;
    g.beginPath();
    lot.poly.forEach(([x, y], k) => (k ? g.lineTo(x / 2, y / 2) : g.moveTo(x / 2, y / 2)));
    g.closePath();
    g.fill();
  });
  const t = new THREE.CanvasTexture(c);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
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
