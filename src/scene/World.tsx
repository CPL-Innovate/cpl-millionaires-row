import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useLoader } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { BUILDINGS, PLATE, STATIONS, plateToWorld, euclidCentreZ, EUCLID, type Building, type MeshModel } from '../data/site';
import { makeDabMaterial, makeGroundMaterial, makeLineMaterial, makeSurfaceMaterial } from '../gl/materials';
import { elm, massing, treeParams, windmillRotor, windmillTower } from '../gl/geometry';
import { U } from '../gl/uniforms';
import { useRebuild } from '../settings/store';

const STATE = { photographed: 0, inferred: 1, invented: 2 } as const;

function edgesOf(geo: THREE.BufferGeometry, angle = 25) {
  const e = new THREE.EdgesGeometry(geo, angle);
  const l = new THREE.LineSegments(e);
  l.computeLineDistances();
  return l.geometry;
}

// dab buffers are flat arrays of [x, y, z, size(m), tint(0–4 along the wash ramp), seed]
function dabGeo(arr: number[]) {
  const n = arr.length / 6;
  const pos = new Float32Array(n * 3), size = new Float32Array(n), tint = new Float32Array(n), seed = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = arr[i * 6]; pos[i * 3 + 1] = arr[i * 6 + 1]; pos[i * 3 + 2] = arr[i * 6 + 2];
    size[i] = arr[i * 6 + 3]; tint[i] = arr[i * 6 + 4]; seed[i] = arr[i * 6 + 5];
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  g.setAttribute('aTint', new THREE.BufferAttribute(tint, 1));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5); // never frustum-cull the wash
  return g;
}

function rand(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function Ground() {
  const tex = useLoader(THREE.TextureLoader, PLATE.url);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const mat = useMemo(() => makeGroundMaterial(tex), [tex]);
  const w = PLATE.widthPx * PLATE.metresPerPx;
  const h = PLATE.heightPx * PLATE.metresPerPx;
  return (
    <mesh rotation-x={-Math.PI / 2} material={mat} renderOrder={-1}>
      <planeGeometry args={[w, h]} />
    </mesh>
  );
}

function Massing({ b }: { b: Building }) {
  const [x, z] = plateToWorld(b.plate[0], b.plate[1]);
  const southSide = z > 0;
  const { geo, edges, surf, line } = useMemo(() => {
    const geo = massing(b.kind as Exclude<Building['kind'], 'mesh'>, b.size);
    return {
      geo,
      edges: edgesOf(geo),
      surf: makeSurfaceMaterial({ state: STATE.inferred }),
      line: makeLineMaterial({ state: STATE.inferred }),
    };
  }, [b]);
  // street front faces Euclid: +z for north-side houses, −z for south-side ones (church is world-aligned)
  const rot = b.kind === 'church' ? 0 : southSide ? Math.PI : 0;
  return (
    <group position={[x, 0, z]} rotation-y={rot + (b.rotation ?? 0)}>
      <mesh geometry={geo} material={surf} renderOrder={1} />
      <lineSegments geometry={edges} material={line} renderOrder={2} />
    </group>
  );
}

// An image-to-3D house (Tripo spike), slimmed by scripts/slim-model.mjs. A house with `looks` maps
// (Everett, from scripts/everett-maps.mjs) also renders as watercolour or texture.
function MeshHouse({ b }: { b: Building }) {
  const model = b.model!;
  const gltf = useGLTF(model.url);
  const [x, z] = plateToWorld(b.plate[0], b.plate[1]);
  const s = model.scale;
  const rot = model.rotation ?? 0;
  const { geo, map, edges, line, contact } = useMemo(() => {
    let mesh: THREE.Mesh | null = null;
    gltf.scene.traverse((o) => {
      if (!mesh && (o as THREE.Mesh).isMesh) mesh = o as THREE.Mesh;
    });
    const m = mesh as unknown as THREE.Mesh;
    // meshopt quantises positions and puts the dequantising scale/offset on the node — bake it
    // into float positions so the mesh is back in its authored units (~1 wide, base at y = 0)
    m.updateWorldMatrix(true, false);
    const geo = (m.geometry as THREE.BufferGeometry).clone();
    const src = geo.getAttribute('position');
    const pos = new Float32Array(src.count * 3);
    for (let i = 0; i < src.count; i++) {
      pos[i * 3] = src.getX(i); pos[i * 3 + 1] = src.getY(i); pos[i * 3 + 2] = src.getZ(i);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.applyMatrix4(m.matrixWorld);
    geo.computeBoundingBox();
    const map = ((m.material as THREE.MeshStandardMaterial).map ?? null) as THREE.Texture | null;
    if (map) map.colorSpace = THREE.SRGBColorSpace;
    return {
      geo,
      map,
      edges: edgesOf(geo, 38),
      line: makeLineMaterial({ mesh: { provenance: model.provenance, box: geo.boundingBox! }, looks: !!model.looks, weight: 0.55 }),
      contact: contactDots(geo, x, z, s, rot),
    };
  }, [gltf, model, x, z, s, rot]);
  useEffect(() => () => contact.dispose(), [contact]);
  const contactMat = useMemo(() => makeDabMaterial({ sway: 0.15, solid: true, role: 'shrub' }), []);
  return (
    <>
      <group position={[x, 0, z]} rotation-y={rot} scale={s}>
        {model.looks ? <LooksSurface geo={geo} map={map} model={model} /> : <PencilSurface geo={geo} map={map} model={model} />}
        <lineSegments geometry={edges} material={line} renderOrder={2} />
      </group>
      <points geometry={contact} material={contactMat} renderOrder={2} />
    </>
  );
}

type SurfaceProps = { geo: THREE.BufferGeometry; map: THREE.Texture | null; model: MeshModel };

function PencilSurface({ geo, map, model }: SurfaceProps) {
  const surf = useMemo(() => makeSurfaceMaterial({ mesh: { provenance: model.provenance, box: geo.boundingBox! }, map }), [geo, map, model]);
  return <mesh geometry={geo} material={surf} renderOrder={1} />;
}

function LooksSurface({ geo, map, model }: SurfaceProps) {
  const [lookMap, normalMap] = useLoader(THREE.TextureLoader, [model.looks!.map, model.looks!.normalMap]);
  const surf = useMemo(() => {
    // glTF UVs: no flip
    lookMap.flipY = normalMap.flipY = false;
    lookMap.colorSpace = THREE.SRGBColorSpace;
    lookMap.anisotropy = normalMap.anisotropy = 8;
    lookMap.needsUpdate = normalMap.needsUpdate = true;
    return makeSurfaceMaterial({ mesh: { provenance: model.provenance, box: geo.boundingBox! }, map, looks: { map: lookMap, normalMap } });
  }, [geo, map, model, lookMap, normalMap]);
  return <mesh geometry={geo} material={surf} renderOrder={1} />;
}

// where the walls meet the ground: soil, grass and low planting in dots all the way round the
// footprint, so the house sits in the painting instead of floating over it
function contactDots(geo: THREE.BufferGeometry, x: number, z: number, s: number, rot = 0) {
  const r = rand(4111);
  const c = Math.cos(rot), sn = Math.sin(rot);
  const p = geo.getAttribute('position');
  const base: [number, number][] = [];
  for (let i = 0; i < p.count; i++) if (p.getY(i) * s < 0.35) base.push([p.getX(i) * s, p.getZ(i) * s]);
  let cx = 0, cz = 0;
  for (const [bx, bz] of base) { cx += bx; cz += bz; }
  cx /= base.length || 1; cz /= base.length || 1;
  const out: number[] = [];
  const n = Math.min(9000, base.length * 6);
  for (let i = 0; i < n && base.length; i++) {
    const [bx, bz] = base[Math.floor(r() * base.length)];
    const dx = bx - cx, dz = bz - cz, len = Math.hypot(dx, dz) || 1;
    const out1 = Math.pow(r(), 1.6) * 1.4; // crowd against the wall, thin out onto the lawn
    const px = bx + (dx / len) * out1 + (r() - 0.5) * 0.5, pz = bz + (dz / len) * out1 + (r() - 0.5) * 0.5;
    const h = r() * 0.55 * (1 - out1 / 1.6);
    const roll = r();
    // soil and shadow tight to the wall, grass and the odd shrub tuft beyond
    const tint = out1 < 0.35 && roll < 0.6 ? 10 + r() * 1.4 : roll < 0.04 ? 6 + Math.floor(r() * 2) : clamp01(0.1 + h * 0.9 + (r() - 0.5) * 0.4) * 3.5;
    // model space → world: rotate about y, then place
    out.push(x + px * c + pz * sn, h + 0.05, z - px * sn + pz * c, 0.1 + r() * 0.22, tint, r());
  }
  return dabGeo(out);
}

// ---------------------------------------------------------------------------------------------
// Pointillism helpers: everything in the environment is painted as dots. Pencil is reserved for
// the buildings (the evidence); paint is the impression around them.
// ---------------------------------------------------------------------------------------------
const SUN = new THREE.Vector3(-0.45, 0.75, 0.5).normalize();
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

// line segments → dots spaced along each segment; tintAt picks an earth/foliage tint per dot
function strokeDots(out: number[], lines: number[], spacing: number, size: number, tintAt: (r: () => number, y: number) => number, r: () => number) {
  for (let i = 0; i < lines.length; i += 6) {
    const ax = lines[i], ay = lines[i + 1], az = lines[i + 2], bx = lines[i + 3], by = lines[i + 4], bz = lines[i + 5];
    const len = Math.hypot(bx - ax, by - ay, bz - az);
    const n = Math.max(1, Math.ceil(len / spacing));
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const y = ay + (by - ay) * t;
      out.push(ax + (bx - ax) * t, y, az + (bz - az) * t, size * (0.75 + r() * 0.5), tintAt(r, y), r());
    }
  }
}

// bark: dots on the surface of each limb, lit by which side faces the sun. density < 1 drops dots
// and enlarges the rest to keep the limbs solid; it draws the same random numbers either way, so
// the trees (and everything generated after them) don't change between Full and Light
function barkDots(out: number[], seg: number[], r: () => number, density = 1) {
  const grow = 1 + (1 - Math.min(1, density)) * 0.7;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), d = new THREE.Vector3(), p1 = new THREE.Vector3(), p2 = new THREE.Vector3(), q = new THREE.Vector3();
  for (let i = 0; i < seg.length; i += 7) {
    a.set(seg[i], seg[i + 1], seg[i + 2]);
    b.set(seg[i + 3], seg[i + 4], seg[i + 5]);
    const rad = seg[i + 6];
    d.subVectors(b, a);
    const len = d.length();
    d.normalize();
    p1.set(0, 1, 0).cross(d);
    if (p1.lengthSq() < 1e-4) p1.set(1, 0, 0);
    p1.normalize();
    p2.crossVectors(d, p1).normalize();
    const step = rad < 0.06 ? 0.26 : Math.max(0.08, rad * 0.5);
    const ring = rad > 0.15 ? 7 : rad > 0.07 ? 3 : 1;
    const n = Math.max(1, Math.ceil(len / step));
    for (let k = 0; k <= n; k++) {
      for (let j = 0; j < ring; j++) {
        const ang = r() * Math.PI * 2;
        q.copy(p1).multiplyScalar(Math.cos(ang)).addScaledVector(p2, Math.sin(ang));
        const t = k / n;
        const light = clamp01(0.45 + 0.45 * q.dot(SUN) + (r() - 0.5) * 0.35);
        const tint = r() < 0.06 ? 2.5 + r() * 2 : 10 + light * 3.6; // a few lichen-green flecks
        const size = Math.max(0.07, rad * 1.05) * (0.8 + r() * 0.6) * grow, seed = r();
        // twigs thin more gently, or they break up into specks
        const keep = Math.min(1, rad > 0.06 ? density : Math.sqrt(density));
        if (seed > keep) continue;
        const s = seed / keep; // kept seeds stay uniform in [0, 1)
        out.push(a.x + d.x * len * t + q.x * rad * 0.85, a.y + d.y * len * t + q.y * rad * 0.85, a.z + d.z * len * t + q.z * rad * 0.85, size, tint, s);
      }
    }
  }
}

// stone box (gate piers): dots over each face, lit by the face normal
function boxDots(out: number[], cx: number, cz: number, w: number, h: number, d: number, r: () => number) {
  const faces: [number, number, number][] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, 0, 1], [0, 0, -1]];
  for (const [nx, ny, nz] of faces) {
    const light = 0.35 + 0.55 * clamp01(nx * SUN.x + ny * SUN.y + nz * SUN.z);
    const area = ny ? w * d : nx ? d * h : w * h;
    const n = Math.ceil(area / 0.02);
    for (let i = 0; i < n; i++) {
      const u = r() - 0.5, v = r() - 0.5;
      const x = nx ? (nx * w) / 2 : u * w;
      const y = ny ? h : nx ? (v + 0.5) * h : (v + 0.5) * h;
      const z = nz ? (nz * d) / 2 : nx ? u * d : v * d;
      out.push(cx + x, y, cz + z, 0.1 + r() * 0.1, 10 + clamp01(light + (r() - 0.5) * 0.3) * 4.6, r());
    }
  }
}

// elms on both tree lawns, fences on the lot lines, gas lamps at the curb
function StreetKit() {
  const g = useRebuild();
  const { crowns, wood, iron, glow, stone } = useMemo(() => {
    const r = rand(g.seed);
    const gen = {
      vase: g.vase, round: g.round, column: g.column, young: g.young, old: g.old,
      treeScale: g.treeScale, crook: g.crook, prune: g.prune, lean: g.lean, reach: g.reach,
    };
    const woodArr: number[] = [];
    const crownArr: number[] = [];
    const fenceArr: number[] = [];
    const lampArr: number[] = [];
    const piers: [number, number][] = [];
    // each tree: its own shape, its own stage of turning, its own crown density
    const place = (seed: number, x: number, z: number, reach: [number, number] = [0, 0]) => {
      const v = elm(seed, treeParams(seed, reach, gen));
      const look = rand(seed * 31 + 5);
      const autumn = g.autumnMin + look() * (g.autumnMax - g.autumnMin); // 0 still green … 1 gold and peach
      const density = Math.max(0.05, g.density + (look() - 0.5) * 2 * g.densityVar);
      const dotScale = 0.8 + look() * 0.45;
      const accents = ((0.4 + look() * 1.4) * g.accents) / 1.1;
      const rot = look() * Math.PI * 2;
      const sc = 1;
      const c = Math.cos(rot), s = Math.sin(rot);
      const tx = (px: number, pz: number) => [x + px * sc * c - pz * sc * s, z + px * sc * s + pz * sc * c];
      const seg: number[] = [];
      for (let i = 0; i < v.wood.length; i += 7) {
        const [ax, az] = tx(v.wood[i], v.wood[i + 2]);
        const [bx, bz] = tx(v.wood[i + 3], v.wood[i + 5]);
        seg.push(ax, v.wood[i + 1] * sc, az, bx, v.wood[i + 4] * sc, bz, v.wood[i + 6] * sc);
      }
      barkDots(woodArr, seg, r, g.barkDensity);
      // impressionist crowns: clusters of opaque dots around the branch anchors. Each dot's colour
      // comes from where it sits in the crown relative to the light — violet/deep green in shadow,
      // green and yellow-green in the body, gold and cream where the low October sun catches it,
      // and the odd coral accent.
      const anchors: number[][] = [];
      let cx = 0, cy = 0, cz = 0;
      for (let i = 0; i < v.crown.length; i += 4) {
        const [wx, wz] = tx(v.crown[i], v.crown[i + 2]);
        const y = v.crown[i + 1] * sc;
        anchors.push([wx, y, wz, v.crown[i + 3]]);
        cx += wx; cy += y; cz += wz;
      }
      cx /= anchors.length; cy /= anchors.length; cz /= anchors.length;
      cy += 1.5;
      let span = 0;
      for (const [ax, ay, az] of anchors) span = Math.max(span, Math.hypot(ax - cx, (ay - cy) * 1.4, az - cz));
      for (const [ax, ay, az, depth] of anchors) {
        const n = Math.round((depth === 0 ? 4 : depth === 1 ? 3 : 2) * Math.max(1, density));
        for (let j = 0; j < n; j++) {
          if (r() > density) continue;
          const u = r() * Math.PI * 2, vv = Math.acos(2 * r() - 1), rad = Math.cbrt(r()) * 1.5;
          const px = ax + Math.sin(vv) * Math.cos(u) * rad;
          const py = ay + Math.cos(vv) * rad * 0.8;
          const pz = az + Math.sin(vv) * Math.sin(u) * rad;
          // light: facing the sun (from the south-west, low) and how far out in the crown
          const dx = px - cx, dy = (py - cy) * 1.4, dz = pz - cz;
          const len = Math.hypot(dx, dy, dz) || 1;
          const facing = (dx * -0.45 + dy * 0.75 + dz * 0.5) / len;
          const outer = Math.min(1, len / span);
          let light = 0.58 + 0.36 * facing + 0.28 * (outer - 0.6) + (r() - 0.5) * 0.42;
          light = Math.min(1, Math.max(0, light));
          let tint = Math.min(4.99, Math.max(0, light * 4.3 + (autumn - 0.45) * 1.6));
          const roll = r();
          if (roll < 0.03 * accents) tint = 6; // pink accent
          else if (roll < 0.045 * accents) tint = 7; // lavender accent
          else if (r() < Math.max(0, autumn - 0.55) * g.turning) tint = 12.5 + r() * 2; // turning leaves: peach and terracotta
          else if (roll < 0.1 && light > 0.55) tint = 5; // cream highlight
          const size = (0.35 + r() * 0.75) * (r() < 0.15 ? 1.7 : 1) * dotScale;
          crownArr.push(px, py, pz, size, tint, r());
        }
      }
    };
    // street trees: irregular spacing, small offsets from the line, the odd gap and the odd pair,
    // crowns reaching out over the roadway toward the open sky
    let seed = 1000 + g.seed * 997;
    for (const side of [-1, 1]) {
      let x = -252 + r() * 6;
      while (x <= 142) {
        const gap = g.spacing + r() * g.spacingRange;
        const skip = Math.abs(x) < 16 || r() < g.gap;
        const zc = euclidCentreZ(x) + side * (EUCLID.roadHalf + 1.7) + (r() - 0.5) * g.offset;
        if (!skip && !STATIONS.some((st) => Math.hypot(st.position[0] - x, st.position[2] - zc) < 5)) {
          place(seed++, x, zc, [0, -side]);
          if (r() < g.pair) place(seed++, x + 2.2 + r(), zc + side * (1.5 + r()), [0, -side]);
        }
        x += gap;
      }
    }
    // lawn trees: scattered over the deep front lawns, away from houses and the street
    const houses = BUILDINGS.map((b) => {
      const [hx, hz] = plateToWorld(b.plate[0], b.plate[1]);
      return { hx, hz, hr: Math.max(b.size[0], b.size[2]) * 0.7 + 4 };
    });
    let placed = 0;
    for (let tries = 0; tries < 2000 && placed < g.lawnTrees; tries++) {
      const x = -255 + r() * 395, z = (r() < 0.55 ? -1 : 1) * (22 + r() * 120);
      if (Math.abs(x) < 16) continue;
      if (houses.some((h) => Math.hypot(h.hx - x, h.hz - z) < h.hr)) continue;
      place(seed++, x, z);
      placed++;
    }
    // fences along both lot lines, gaps for drives
    const drives = [-40, -84, -139, -180, -68, 30, 26];
    const fenceRun = (x0: number, x1: number, side: number) => {
      for (let x = x0; x < x1; x += 2.4) {
        if (drives.some((d) => Math.abs(d - x) < 2.6)) continue;
        const z = euclidCentreZ(x) + side * (EUCLID.rowHalf + 0.3);
        const z2 = euclidCentreZ(x + 2.4) + side * (EUCLID.rowHalf + 0.3);
        fenceArr.push(x, 0, z, x, 1.25, z); // post
        fenceArr.push(x, 1.1, z, x + 2.4, 1.1, z2, x, 0.35, z, x + 2.4, 0.35, z2); // rails
        for (let p = 0.4; p < 2.4; p += 0.4) {
          const zz = z + ((z2 - z) * p) / 2.4;
          fenceArr.push(x + p, 0.35, zz, x + p, 1.2, zz); // pickets
        }
      }
    };
    fenceRun(-250, -12, -1);
    fenceRun(12, 140, -1);
    fenceRun(-250, -12, 1);
    fenceRun(12, 140, 1);
    // Wade gate piers on the NW corner frontage (story beat: seven thousand dollars of fence)
    for (const x of [-12, -36, -44, -62, -80, -88, -100]) piers.push([x, euclidCentreZ(x) - EUCLID.rowHalf - 0.3]);
    // gas lamps
    for (let x = -246; x <= 140; x += 36) {
      for (const side of [-1, 1]) {
        if (Math.abs(x) < 14) continue;
        const z = euclidCentreZ(x) + side * (EUCLID.roadHalf + 0.6);
        lampArr.push(x, 0, z, x, 3.3, z);
        const l = 0.28;
        const y0 = 3.3, y1 = 3.95;
        for (const [ax, az, bx, bz] of [[-l, -l, l, -l], [l, -l, l, l], [l, l, -l, l], [-l, l, -l, -l]]) {
          lampArr.push(x + ax, y0, z + az, x + bx, y0, z + bz);
          lampArr.push(x + ax, y1, z + az, x + bx, y1, z + bz);
          lampArr.push(x + ax, y0, z + az, x + ax * 0.6, y1, z + az * 0.6);
        }
        lampArr.push(x, y1, z, x, 4.25, z);
      }
    }
    // iron: fences and lamp standards as dark dots with the odd glint
    const ironArr: number[] = [];
    const ironTint = (rr: () => number) => (rr() < 0.08 ? 13.5 : 10 + rr() * 1.2);
    strokeDots(ironArr, fenceArr, 0.085, 0.075, ironTint, r);
    strokeDots(ironArr, lampArr, 0.09, 0.1, ironTint, r);
    // lantern glass catches the light: a warm cluster at each lamp head
    const glowArr: number[] = [];
    for (let i = 0; i < lampArr.length; i += 6) {
      if (lampArr[i + 4] !== 3.3) continue; // one per standard (the post segment ends at 3.3 m)
      const x = lampArr[i + 3], z = lampArr[i + 5];
      for (let j = 0; j < 40; j++) {
        glowArr.push(x + (r() - 0.5) * 0.5, 3.35 + r() * 0.6, z + (r() - 0.5) * 0.5, 0.08 + r() * 0.08, r() < 0.5 ? 5 : 4 + r(), r());
      }
    }
    const stoneArr: number[] = [];
    for (const [x, z] of piers) boxDots(stoneArr, x, z, 1.1, 2.6, 1.1, r);
    return {
      crowns: dabGeo(crownArr),
      wood: dabGeo(woodArr),
      iron: dabGeo(ironArr),
      glow: dabGeo(glowArr),
      stone: dabGeo(stoneArr),
    };
  }, [g]);
  // regrowing replaces the buffers; free the old ones on the GPU
  useEffect(() => () => [crowns, wood, iron, glow, stone].forEach((geo) => geo.dispose()), [crowns, wood, iron, glow, stone]);
  const crownMat = useMemo(() => makeDabMaterial({ sway: 1, solid: true, role: 'crown' }), []);
  const woodMat = useMemo(() => makeDabMaterial({ sway: 0.6, solid: true, role: 'bark' }), []);
  const kitMat = useMemo(() => makeDabMaterial({ solid: true, role: 'kit' }), []);
  return (
    <group>
      <points geometry={wood} material={woodMat} renderOrder={2} />
      <points geometry={crowns} material={crownMat} renderOrder={2} />
      <points geometry={iron} material={kitMat} renderOrder={2} />
      <points geometry={glow} material={kitMat} renderOrder={2} />
      <points geometry={stone} material={kitMat} renderOrder={2} />
    </group>
  );
}

// evergreen shrubs along the foundations
function Washes() {
  const g = useRebuild();
  const { shrubs } = useMemo(() => {
    const r = rand(19);
    // shrubs: clumps along each house front (and the church's west porch)
    const shrubs: number[] = [];
    for (const b of BUILDINGS) {
      const [bx, bz] = plateToWorld(b.plate[0], b.plate[1]);
      const rot = b.kind === 'church' ? -Math.PI / 2 : bz > 0 ? Math.PI : 0;
      // church: nave runs along x (length = size[2]), west front faces Case
      const [w, , d] = b.size;
      const front = d / 2 + 1.6;
      const span = b.kind === 'church' ? w * 0.8 : w;
      const c = Math.cos(rot), s = Math.sin(rot);
      for (let i = 0; i < 9; i++) {
        if (r() < 0.25) continue;
        const lx = -span / 2 + (i + 0.5) * (span / 9) + (r() - 0.5) * 1.5, lz = front + (r() - 0.5);
        const cx = bx + lx * c + lz * s, cz = bz - lx * s + lz * c;
        const hgt = 0.8 + r() * 1.2;
        for (let j = 0; j < g.shrubs; j++) {
          const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * 1.2;
          const yy = r() * hgt;
          const light = Math.min(1, Math.max(0, 0.25 + (yy / hgt) * 0.35 + Math.cos(a - 2.4) * 0.15 + (r() - 0.5) * 0.3));
          shrubs.push(cx + Math.cos(a) * rr, yy + 0.25, cz + Math.sin(a) * rr, 0.2 + r() * 0.35, r() < 0.05 ? 6 + Math.floor(r() * 2) : light * 4, r());
        }
      }
    }
    return { shrubs: dabGeo(shrubs) };
  }, [g]);
  useEffect(() => () => shrubs.dispose(), [shrubs]);
  const shrubMat = useMemo(() => makeDabMaterial({ sway: 0.25, solid: true, role: 'shrub' }), []);
  return (
    <group>
      <points geometry={shrubs} material={shrubMat} renderOrder={2} />
    </group>
  );
}

// a handful of leaves still coming down
function FallingLeaves() {
  const g = useRebuild();
  const mat = useMemo(() => makeDabMaterial({ falling: true, solid: true }), []);
  const geo = useMemo(() => {
    const r = rand(83);
    const arr: number[] = [];
    for (let i = 0; i < g.leaves; i++) arr.push((r() - 0.5) * 80, r() * 22, (r() - 0.5) * 80, 0.07 + r() * 0.08, r() < 0.1 ? 6 : 3 + r() * 2, r());
    return dabGeo(arr);
  }, [g.leaves]);
  useEffect(() => () => geo.dispose(), [geo]);
  return <points geometry={geo} material={mat} renderOrder={4} />;
}

// the ground itself, in camera-facing dots: a fine layer around you and a coarse one beyond
function Carpet() {
  const g = useRebuild();
  const layers = useMemo(() => {
    const make = (seed: number, count: number, box: number, s0: number, s1: number, near: boolean) => {
      const r = rand(seed);
      const arr: number[] = [];
      for (let i = 0; i < count; i++) arr.push(r() * box, 0, r() * box, s0 + r() * (s1 - s0), 0, r());
      return { geo: dabGeo(arr), mat: makeDabMaterial({ solid: true, carpet: { box, near } }) };
    };
    return [make(101, g.nearCount, g.nearBox, 0.08, 0.22, true), make(202, g.farCount, g.farBox, 0.45, 1.35, false)];
  }, [g.nearCount, g.nearBox, g.farCount, g.farBox]);
  useEffect(() => () => layers.forEach((l) => { l.geo.dispose(); l.mat.dispose(); }), [layers]);
  return (
    <group>
      {layers.map((l, i) => (
        <points key={i} geometry={l.geo} material={l.mat} renderOrder={1} />
      ))}
    </group>
  );
}

function Windmill() {
  const rotor = useRef<THREE.Group>(null);
  const { tower, blades, mat } = useMemo(() => {
    const r = rand(29);
    const t: number[] = [], b: number[] = [];
    strokeDots(t, windmillTower(), 0.14, 0.13, (rr) => 10.4 + rr() * 1.8, r);
    strokeDots(b, windmillRotor(), 0.16, 0.11, (rr) => 12 + rr() * 2.2, r);
    return { tower: dabGeo(t), blades: dabGeo(b), mat: makeDabMaterial({ solid: true }) };
  }, []);
  useFrame((_, dt) => {
    if (rotor.current) rotor.current.rotation.z += dt * 0.35;
  });
  const brush = BUILDINGS.find((b) => b.id === 'brush')!;
  const [bx, bz] = plateToWorld(brush.plate[0], brush.plate[1]);
  return (
    <group position={[bx - 22, 0, bz - 30]}>
      <points geometry={tower} material={mat} renderOrder={2} />
      <group ref={rotor} position={[0, 19, 0.8]}>
        <points geometry={blades} material={mat} renderOrder={2} />
      </group>
    </group>
  );
}

export function World() {
  useFrame((state, dt) => {
    U.uTime.value += dt;
    const cam = state.camera as THREE.PerspectiveCamera;
    U.uPxScale.value = (state.size.height * state.gl.getPixelRatio()) / (2 * Math.tan((cam.fov * Math.PI) / 360));
  });
  return (
    <group>
      <Ground />
      {BUILDINGS.map((b) => (b.model ? <MeshHouse key={b.id} b={b} /> : <Massing key={b.id} b={b} />))}
      <Carpet />
      <StreetKit />
      <Washes />
      <FallingLeaves />
      <Windmill />
    </group>
  );
}

BUILDINGS.forEach((b) => b.model && useGLTF.preload(b.model.url));
