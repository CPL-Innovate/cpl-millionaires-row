import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { MassingKind } from '../data/site';

// ---------------------------------------------------------------------------------------------
// Massing — deliberately simple, typology-level volumes. Everything here is *inferred*.
// Local frame: origin at footprint centre on the ground, street front facing +z.
// ---------------------------------------------------------------------------------------------

type V = [number, number, number];

function polyGeo(tris: V[][]): THREE.BufferGeometry {
  const pos: number[] = [];
  for (const t of tris) for (const v of t) pos.push(...v);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

const quad = (a: V, b: V, c: V, d: V): V[][] => [[a, b, c], [a, c, d]];

function box(w: number, h: number, d: number, x = 0, y = 0, z = 0) {
  const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  g.deleteAttribute('uv');
  g.translate(x, y + h / 2, z);
  return g;
}

function cylinder(r: number, h: number, x: number, y: number, z: number, seg = 14) {
  const g = new THREE.CylinderGeometry(r, r, h, seg, 1).toNonIndexed();
  g.deleteAttribute('uv');
  g.translate(x, y + h / 2, z);
  g.computeVertexNormals();
  return g;
}

function cone(r: number, h: number, x: number, y: number, z: number, seg = 14) {
  const g = new THREE.ConeGeometry(r, h, seg, 1).toNonIndexed();
  g.deleteAttribute('uv');
  g.translate(x, y + h / 2, z);
  g.computeVertexNormals();
  return g;
}

// hip roof over a w × d rectangle at height y, rising rh, with eave overhang o
function hipRoof(w: number, d: number, y: number, rh: number, o = 0.8, x = 0, z = 0) {
  const W = w / 2 + o, D = d / 2 + o;
  const r = Math.max(0, Math.abs(w - d) / 2);
  const along = w >= d;
  const a: V = [x - W, y, z + D], b: V = [x + W, y, z + D], c: V = [x + W, y, z - D], e: V = [x - W, y, z - D];
  const r1: V = along ? [x - r, y + rh, z] : [x, y + rh, z + r];
  const r2: V = along ? [x + r, y + rh, z] : [x, y + rh, z - r];
  const tris: V[][] = along
    ? [...quad(a, b, r2, r1), ...quad(c, e, r1, r2), [b, c, r2], [e, a, r1]]
    : [...quad(b, c, r2, r1), ...quad(e, a, r1, r2), [a, b, r1], [c, e, r2]];
  return polyGeo(tris);
}

// gable roof, ridge along x
function gableRoofX(len: number, w: number, y: number, rh: number, o = 0.6, x = 0, z = 0) {
  const L = len / 2 + o, W = w / 2 + o;
  const a: V = [x - L, y, z + W], b: V = [x + L, y, z + W], c: V = [x + L, y, z - W], e: V = [x - L, y, z - W];
  const r1: V = [x - L, y + rh, z], r2: V = [x + L, y + rh, z];
  return polyGeo([...quad(a, b, r2, r1), ...quad(c, e, r1, r2), [b, c, r2], [e, a, r1]]);
}

// mansard: steep lower slope from (w,d) to inset, then a flat deck
function mansard(w: number, d: number, y: number, mh: number, inset = 1.4) {
  const W = w / 2 + 0.4, D = d / 2 + 0.4, w2 = w / 2 - inset, d2 = d / 2 - inset;
  const A: V[] = [[-W, y, D], [W, y, D], [W, y, -D], [-W, y, -D]];
  const B: V[] = [[-w2, y + mh, d2], [w2, y + mh, d2], [w2, y + mh, -d2], [-w2, y + mh, -d2]];
  const tris: V[][] = [];
  for (let i = 0; i < 4; i++) tris.push(...quad(A[i], A[(i + 1) % 4], B[(i + 1) % 4], B[i]));
  tris.push(...quad(B[0], B[1], B[2], B[3]));
  return polyGeo(tris);
}

function gableDormer(x: number, y: number, z: number, w = 1.6, h = 1.8, depth = 1.6) {
  return mergeGeometries([box(w, h, depth, x, y, z), gableRoofZ(depth, w, y + h, 1.0, 0.15, x, z)]);
}

// gable roof, ridge along z
function gableRoofZ(len: number, w: number, y: number, rh: number, o = 0.4, x = 0, z = 0) {
  const g = gableRoofX(len, w, y, rh, o, 0, 0);
  g.rotateY(Math.PI / 2);
  g.translate(x, 0, z);
  return g;
}

export function massing(kind: MassingKind, [w, h, d]: [number, number, number]): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  if (kind === 'villa') {
    // Italianate villa: two storeys, low hip roof with deep eaves, belvedere, front veranda
    parts.push(box(w, h, d));
    parts.push(hipRoof(w, d, h, 2.2, 1.1));
    parts.push(box(3.6, 2.6, 3.6, 0, h + 1.2, 0));
    parts.push(hipRoof(3.6, 3.6, h + 3.8, 0.9, 0.5));
    parts.push(box(w * 0.85, 0.35, 3.2, 0, 3.6, d / 2 + 1.6)); // veranda roof
    for (let i = 0; i < 6; i++) parts.push(box(0.25, 3.6, 0.25, -w * 0.4 + (i * w * 0.8) / 5, 0, d / 2 + 3)); // posts
    parts.push(box(w * 0.6, h * 0.75, d * 0.45, -w * 0.1, 0, -d / 2 - d * 0.2)); // rear service wing
    parts.push(hipRoof(w * 0.6, d * 0.45, h * 0.75, 1.4, 0.6, -w * 0.1, -d / 2 - d * 0.2));
  } else if (kind === 'mansard') {
    // Second Empire: brick block, steep mansard with dormers, chimney
    parts.push(box(w, h, d));
    parts.push(mansard(w, d, h, 3.6));
    for (let i = 0; i < 3; i++) parts.push(gableDormer(-w * 0.3 + i * w * 0.3, h + 0.7, d / 2 - 0.3));
    parts.push(box(1.2, 3, 1.6, w * 0.3, h + 2.5, -d * 0.2));
    parts.push(box(w * 0.4, 3.8, 2.4, w * 0.15, 0, d / 2 + 1.2)); // entrance porch
    parts.push(box(w * 0.75, h * 0.8, d * 0.5, -w * 0.5, 0, -d * 0.15)); // west wing
    parts.push(hipRoof(w * 0.75, d * 0.5, h * 0.8, 1.6, 0.5, -w * 0.5, -d * 0.15));
  } else if (kind === 'romanesque') {
    // Brush: heavy stone block, steep hip, corner tower with conical cap, front gable
    parts.push(box(w, h, d));
    parts.push(hipRoof(w, d, h, 6.5, 0.6));
    parts.push(cylinder(3.6, h + 4, -w / 2 + 1.5, 0, d / 2 - 1.5));
    parts.push(cone(4.1, 6.5, -w / 2 + 1.5, h + 4, d / 2 - 1.5));
    parts.push(box(7, h + 2, 2, w * 0.18, 0, d / 2 + 1));
    parts.push(gableRoofZ(2.4, 7.6, h + 2, 4, 0.2, w * 0.18, d / 2 + 1));
    parts.push(box(8, 4.2, 6, w / 2 + 4, 0, d * 0.1)); // porte-cochère
    parts.push(box(2.2, 3.5, 1.4, w * 0.3, h + 3, -d * 0.2)); // chimney
  } else if (kind === 'church') {
    // St. Paul's: nave along x, west gable to Case, square tower with pinnacles at the NW corner.
    // here w = nave width (z), d = nave length (x)
    const L = d, W = w;
    parts.push(box(L, h, W));
    parts.push(gableRoofX(L, W, h, 8, 0.5));
    parts.push(box(6, 30, 6, -L / 2 + 2, 0, -W / 2 - 1.5));
    for (const [px, pz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      parts.push(cone(0.6, 4.5, -L / 2 + 2 + px * 2.6, 30, -W / 2 - 1.5 + pz * 2.6, 6));
    }
    parts.push(box(10, h * 0.9, 6, L * 0.15, 0, W / 2 + 3)); // south transept / parish house
    parts.push(gableRoofZ(6, 10, h * 0.9, 4, 0.3, L * 0.15, W / 2 + 3));
    parts.push(box(3.5, 4.5, 3.5, -L / 2 - 1.2, 0, W * 0.15)); // west porch
  }
  return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)));
}

// ---------------------------------------------------------------------------------------------
// Bare American elms (late October), as pencil lines. Vase form: short trunk, limbs that rise
// steeply and fan out, then fine twigs.
// ---------------------------------------------------------------------------------------------
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export interface Elm {
  crown: number[]; // xyz + depth-of-branch: anchors for the crown's dots
  wood: number[]; // segments as [ax, ay, az, bx, by, bz, radius] for painting bark in dots
}

// Every street tree gets its own personality, so no two are alike. Most are American elms (vase:
// short trunk, limbs that rise and fan out); some are rounder maple-like crowns or narrow upright
// trees, as on an avenue replanted piecemeal over decades.
export type TreeForm = 'vase' | 'round' | 'column';
export interface TreeParams {
  form: TreeForm;
  scale: number; // overall size; < 0.7 is a young replacement tree
  limbs: number; // scaffold limbs off the trunk
  trunkH: number; // height of the first fork (m, before scale)
  lean: number; // whole-tree lean (radians)
  leanDir: number;
  crook: number; // how crooked limbs are
  prune: number; // chance a branch never grew (asymmetry)
  reach: [number, number]; // phototropism: crowns lean toward open sky over the street (xz)
  reachAmt: number;
}

// generator knobs that shape the population of trees (exposed in the UI)
export interface TreeGen {
  vase: number;
  round: number;
  column: number;
  young: number;
  old: number;
  treeScale: number;
  crook: number;
  prune: number;
  lean: number;
  reach: number;
}
export const TREE_GEN_DEFAULT: TreeGen = { vase: 0.68, round: 0.2, column: 0.12, young: 0.1, old: 0.1, treeScale: 1, crook: 0.5, prune: 0.22, lean: 0.1, reach: 0.12 };

export function treeParams(seed: number, reach: [number, number] = [0, 0], g: TreeGen = TREE_GEN_DEFAULT): TreeParams {
  const r = rng(seed * 7919 + 13);
  const total = g.vase + g.round + g.column || 1;
  const f = r() * total;
  const form: TreeForm = f < g.vase ? 'vase' : f < g.vase + g.round ? 'round' : 'column';
  const age = r();
  const scale = (age < g.young ? 0.5 + r() * 0.2 : age > 1 - g.old ? 1.2 + r() * 0.15 : 0.82 + r() * 0.34) * g.treeScale;
  return {
    form,
    scale,
    limbs: form === 'round' ? 4 + Math.floor(r() * 3) : form === 'column' ? 2 + Math.floor(r() * 2) : 3 + Math.floor(r() * 3),
    trunkH: form === 'round' ? 2.2 + r() * 1.2 : form === 'column' ? 2.6 + r() * 1.6 : 3.0 + r() * 2.2,
    lean: r() * g.lean,
    leanDir: r() * Math.PI * 2,
    crook: 0.15 + r() * g.crook * 0.7,
    prune: r() * g.prune,
    reach,
    reachAmt: g.reach,
  };
}

export function elm(seed: number, P: TreeParams = treeParams(seed)): Elm {
  const r = rng(seed);
  const crown: number[] = [];
  const wood: number[] = [];
  const limb = (a: THREE.Vector3, b: THREE.Vector3, rad: number) => wood.push(a.x, a.y, a.z, b.x, b.y, b.z, rad);
  const sc = P.scale;
  // form-specific growth habits
  const habit = {
    vase: { radial: 0.32, spreadHi: 0.42, spreadLo: 0.72, upHi: 0.15, upLo: 0.05, len: 8.2, depth: 5 },
    round: { radial: 0.8, spreadHi: 0.75, spreadLo: 0.9, upHi: 0.05, upLo: -0.12, len: 6.4, depth: 5 },
    column: { radial: 0.14, spreadHi: 0.25, spreadLo: 0.45, upHi: 0.35, upLo: 0.2, len: 7.2, depth: 5 },
  }[P.form];
  const reach = new THREE.Vector3(P.reach[0], 0, P.reach[1]).multiplyScalar(P.reachAmt);

  const grow = (start: THREE.Vector3, dir: THREE.Vector3, len: number, depth: number, thick: number) => {
    let p = start.clone();
    const d = dir.clone();
    const pieces = 2 + Math.floor(r() * 3); // 2–4 kinks per branch
    for (let k = 0; k < pieces; k++) {
      d.add(new THREE.Vector3((r() - 0.5) * P.crook, (r() - 0.35) * P.crook * 0.5, (r() - 0.5) * P.crook)).add(reach).normalize();
      const q = p.clone().addScaledVector(d, (len / pieces) * (0.8 + r() * 0.4));
      limb(p, q, Math.max(0.035, thick * (1 - (k / pieces) * 0.35)));
      if (depth <= 2) crown.push(q.x, q.y, q.z, depth);
      p = q;
    }
    if (depth <= 0) return;
    const hi = depth > 3;
    const n = hi ? 2 + (r() < 0.5 ? 1 : 0) : 2 + (r() < 0.25 ? 1 : 0);
    const twist = r() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      if (r() < P.prune && depth < 5) continue;
      const spread = (hi ? habit.spreadHi : habit.spreadLo) * (0.75 + r() * 0.5);
      const az = twist + (i / n) * Math.PI * 2 + (r() - 0.5) * 1.4;
      const nd = dir.clone()
        .add(new THREE.Vector3(Math.cos(az) * spread, (hi ? habit.upHi : habit.upLo) + r() * 0.2, Math.sin(az) * spread))
        .normalize();
      grow(p, nd, len * (0.62 + r() * 0.22), depth - 1, thick * (0.5 + r() * 0.12));
    }
  };

  // trunk: a slightly crooked, leaning column up to the first fork
  const leanV = new THREE.Vector3(Math.cos(P.leanDir) * P.lean, 1, Math.sin(P.leanDir) * P.lean).normalize();
  const forkH = P.trunkH * sc + r() * 0.6;
  let t0 = new THREE.Vector3(0, -0.2, 0);
  const trunkR = 0.3 + sc * 0.14;
  for (let k = 1; k <= 3; k++) {
    const t1 = leanV.clone().multiplyScalar((forkH * k) / 3).add(new THREE.Vector3((r() - 0.5) * 0.25, 0, (r() - 0.5) * 0.25));
    limb(t0, t1, trunkR * (1 - k * 0.06));
    t0 = t1;
  }
  const trunkTop = t0;
  const limbs = P.limbs;
  const az0 = r() * Math.PI * 2;
  for (let i = 0; i < limbs; i++) {
    const az = az0 + (i / limbs) * Math.PI * 2 + (r() - 0.5) * 0.9;
    const rad = habit.radial * (0.7 + r() * 0.6);
    const dir = new THREE.Vector3(Math.cos(az) * rad, 1, Math.sin(az) * rad).add(leanV).normalize();
    // forks happen at slightly different heights
    const start = trunkTop.clone().addScaledVector(leanV, -r() * 0.8 * sc);
    grow(start, dir, habit.len * sc * (0.8 + r() * 0.4), habit.depth, 0.24 * (0.8 + sc * 0.3));
  }
  return { crown, wood };
}

// ---------------------------------------------------------------------------------------------
// Brush's 1888 wind dynamo: lattice tower ~18 m to the hub, 17 m rotor of many thin blades.
// ---------------------------------------------------------------------------------------------
export function windmillTower(): number[] {
  const out: number[] = [];
  const s = (a: V, b: V) => out.push(...a, ...b);
  const H = 19;
  const lv = 8;
  const corner = (t: number, i: number): V => {
    const half = 3.2 * (1 - t) + 0.9 * t;
    const sx = i === 0 || i === 3 ? -1 : 1, sz = i < 2 ? -1 : 1;
    return [sx * half, t * H, sz * half];
  };
  for (let i = 0; i < 4; i++) s(corner(0, i), corner(1, i));
  for (let k = 0; k <= lv; k++) {
    const t = k / lv;
    for (let i = 0; i < 4; i++) s(corner(t, i), corner(t, (i + 1) % 4));
    if (k < lv) {
      const t2 = (k + 1) / lv;
      for (let i = 0; i < 4; i++) {
        s(corner(t, i), corner(t2, (i + 1) % 4));
        s(corner(t, (i + 1) % 4), corner(t2, i));
      }
    }
  }
  // tail vane outline behind the hub
  s([0, H, -0.5], [0, H, -9]);
  s([0, H - 2.5, -6], [0, H + 2.5, -6]);
  s([0, H + 2.5, -6], [0, H + 2.5, -12]);
  s([0, H - 2.5, -6], [0, H - 2.5, -12]);
  s([0, H - 2.5, -12], [0, H + 2.5, -12]);
  return out;
}

export function windmillRotor(): number[] {
  const out: number[] = [];
  const blades = 72;
  const R = 8.5, r0 = 1.6;
  for (let i = 0; i < blades; i++) {
    const a = (i / blades) * Math.PI * 2;
    const a2 = a + 0.035;
    out.push(Math.cos(a) * r0, Math.sin(a) * r0, 0, Math.cos(a) * R, Math.sin(a) * R, 0);
    out.push(Math.cos(a) * R, Math.sin(a) * R, 0, Math.cos(a2) * R, Math.sin(a2) * R, 0.2);
  }
  for (const rr of [r0, R * 0.55, R]) {
    const n = 96;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, b = ((i + 1) / n) * Math.PI * 2;
      out.push(Math.cos(a) * rr, Math.sin(a) * rr, 0.1, Math.cos(b) * rr, Math.sin(b) * rr, 0.1);
    }
  }
  return out;
}

export function lineGeo(arr: number[]) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
  // per-segment distance for dashing
  const ld = new Float32Array(arr.length / 3);
  for (let i = 0; i < arr.length / 6; i++) {
    const dx = arr[i * 6 + 3] - arr[i * 6], dy = arr[i * 6 + 4] - arr[i * 6 + 1], dz = arr[i * 6 + 5] - arr[i * 6 + 2];
    ld[i * 2] = 0;
    ld[i * 2 + 1] = Math.hypot(dx, dy, dz);
  }
  g.setAttribute('lineDistance', new THREE.BufferAttribute(ld, 1));
  return g;
}
