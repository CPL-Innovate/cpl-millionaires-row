import * as THREE from 'three';
import { PALETTES, type PaletteId } from '../palettes';
import { LIVE_KEYS } from '../settings/schema';
import { settings, type PaletteOverride } from '../settings/store';

// One noise texture drives every reveal and every wobble (Chartogne-style "drawing itself").
function makeNoiseTexture(size = 256) {
  const data = new Uint8Array(size * size * 4);
  const rand = (x: number, y: number) => {
    const s = Math.sin(((x % size) + 1) * 127.1 + ((y % size) + 1) * 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const value = (x: number, y: number, period: number) => {
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const fx = smooth(x - x0), fy = smooth(y - y0);
    const p = (a: number, b: number) => rand(((a % period) + period) % period, ((b % period) + period) % period);
    const a = p(x0, y0), b = p(x0 + 1, y0), c = p(x0, y0 + 1), d = p(x0 + 1, y0 + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let v = 0, amp = 0.5, total = 0;
      for (let o = 0; o < 5; o++) {
        const period = 8 << o;
        v += value((x / size) * period, (y / size) * period, period) * amp;
        total += amp;
        amp *= 0.5;
      }
      const g = Math.round((v / total) * 255);
      const i = (y * size + x) * 4;
      data[i] = g;
      data[i + 1] = Math.round(rand(x * 3, y * 7) * 255); // white noise for paper grain
      data[i + 2] = g;
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

// Shared uniform objects: every material references these same instances, so a palette switch,
// the evidence slider or the reveal animation is one assignment.
export const U = {
  uTime: { value: 0 },
  uNoise: { value: makeNoiseTexture() },
  uPaper: { value: new THREE.Color() },
  uPencil: { value: new THREE.Color() },
  uInk: { value: new THREE.Color() },
  uFaint: { value: new THREE.Color() },
  uPlateColor: { value: 0.5 },
  uEvidence: { value: 0 }, // 0 = full drawing, 1 = stripped to evidence
  uStreet: { value: 0 }, // 0 = plate (map) treatment, 1 = street drawing
  uRevealCenter: { value: new THREE.Vector2(0, 0) },
  uRevealRadius: { value: 0 },
  uWash: { value: [0, 1, 2, 3, 4].map(() => new THREE.Color()) },
  uFoliage: { value: [0, 1, 2, 3, 4, 5, 6, 7].map(() => new THREE.Color()) },
  uEarth: { value: [0, 1, 2, 3, 4, 5].map(() => new THREE.Color()) },
  uPxScale: { value: 800 }, // pixels per metre at 1 m depth (set each frame)
  uLightDir: { value: new THREE.Vector3(-0.45, 0.75, 0.5).normalize() },
  // Everett look (0 pencil, 1 watercolour, 2 texture): from → to as uLookT runs 0 → 1
  uLookFrom: { value: 0 },
  uLookTo: { value: 0 },
  uLookT: { value: 1 },
  uLookLines: { value: 1 }, // pencil edge lines on the Everett mesh, per look
};

// live generator parameters: one shared uniform per key, named uG_<key>
export const G: Record<string, { value: number }> = Object.fromEntries(LIVE_KEYS.map((k) => [`uG_${k}`, { value: 0 }]));
Object.assign(U, G);
const applyLive = () => {
  const v = settings.get().v;
  for (const k of LIVE_KEYS) G[`uG_${k}`].value = v[k];
};
applyLive();
settings.subscribe(applyLive);

export function applyPalette(id: PaletteId, over: PaletteOverride = {}) {
  const p = PALETTES[id];
  U.uPaper.value.set(over.paper ?? p.paper).convertSRGBToLinear();
  U.uPencil.value.set(p.pencil).convertSRGBToLinear();
  U.uInk.value.set(p.ink).convertSRGBToLinear();
  U.uFaint.value.set(p.faint).convertSRGBToLinear();
  U.uPlateColor.value = p.plateColor;
  p.wash.forEach((c, i) => U.uWash.value[i].set(c).convertSRGBToLinear());
  p.foliage.forEach((c, i) => U.uFoliage.value[i].set(over.foliage?.[i] ?? c).convertSRGBToLinear());
  p.earth.forEach((c, i) => U.uEarth.value[i].set(over.earth?.[i] ?? c).convertSRGBToLinear());
}
applyPalette('graphite');

if (import.meta.env.DEV) (window as unknown as { __U: typeof U }).__U = U;
