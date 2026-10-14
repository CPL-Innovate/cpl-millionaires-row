import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { euclidCentreZ } from '../data/site';
import { makeDabMaterial } from '../gl/materials';
import { dabGeo, rand } from './dabs';
import { traffic, type Carriage } from './traffic';

// Carriages on Euclid, painted in dots like the rest of the environment (they're impression, not
// evidence). The model is a stagecoach rig baked by scripts/bake-carriage.py from Carriage/: coach
// and driver, two wheel axles, and one horse whose walk is a 16-key morph loop (one stride of the
// 3ds Max point cache). Dots are scattered over the slim mesh once; each frame the wheels turn and
// the horses' dots are blended between the two nearest keys.

const URL = '/models/carriage.glb';
const KEYS = 16;
const SUN = new THREE.Vector3(-0.45, 0.75, 0.5).normalize();
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
// the walk plays this much faster than authored (1.0 m/s, a slow walk) — feet stay planted because
// the road speed is scaled with it
const GAIT = 1.5;
// where the carriages run: past both ends of the trees, then they wrap round out of sight
const X0 = -300, X1 = 190;

// the fleet: direction, start, and the team's coat (a nudge along the horse ramp: darker bay …
// flaxen chestnut)
const FLEET = [
  { dir: 1, x: -150, coat: 0 },
  { dir: -1, x: 40, coat: -0.5 },
  { dir: 1, x: 95, coat: 0.45 },
  { dir: -1, x: -210, coat: 0.15 },
];
const LANE = 3.4; // keep to the right, wheels near the ruts

// Colour follows a loose watercolour of a pair and a hack (shared reference, not a source): the
// coach in indigo and slate with paper left white where light catches it, chestnut horses with
// cream manes and dark legs, a driver in olive and umber, a fleck of ochre lamp and cerulean. Tints
// 20–28 index the palette's carriage ramp (see palettes.ts): 20–22 coach, 23–26 horse, 27 ochre,
// 28 cerulean. The baked texture colour only sets lightness on the coach.
type Role = 'coach' | 'driver' | 'horse';
type Dot = { r: number; g: number; b: number; light: number; y: number; up: number; coat: number };
function tintFor(role: Role, d: Dot, rr: () => number) {
  const j = (rr() - 0.5) * 0.5, roll = rr();
  if (role === 'coach') {
    // indigo stays low (wheels, undercarriage); the body is a blue-grey wash with paper left white
    if (roll < 0.2 * d.light && d.y > 0.9) return 26;
    if (roll < 0.02) return 27;
    if (roll < 0.035) return 25;
    if (roll < 0.06) return 28;
    const L = 0.3 * Math.pow(d.r, 1 / 2.2) + 0.59 * Math.pow(d.g, 1 / 2.2) + 0.11 * Math.pow(d.b, 1 / 2.2);
    const low = d.y < 0.9 ? 1 - d.y / 0.9 : 0;
    return 20 + clamp(0.7 + L * 1.2 + (d.light - 0.45) * 1.8 - low * 1.1 + j, 0, 2);
  }
  if (role === 'driver') {
    if (d.y > 2.25 || roll < 0.25) return 23 + rr() * 0.5; // hat, face, hands in umber
    return clamp(0.15 + (d.light - 0.5) * 1.2 + j, 0, 1.2); // olive coat (foliage ramp)
  }
  if (d.y < 0.12) return 20 + rr() * 0.4; // hooves
  if (roll < 0.05) return 20.3 + rr() * 0.5; // harness straps
  if (d.y > 1.0 && d.up > 0.45 && rr() < 0.5) return 25.4 + rr() * 0.6; // mane, sunlit back
  if (d.light > 0.7 && rr() < 0.12) return 26; // paper showing through on the lit flank
  const legs = d.y < 0.65 ? 1 - d.y / 0.65 : 0; // legs darken toward the ground
  return 23 + clamp(1.0 + d.light * 1.5 + d.coat - legs * 1.1 + j, 0, 2.6);
}

type Part = { mesh: THREE.Mesh; m: THREE.Matrix4 };

// scatter n dots over a mesh, area-weighted; returns per-dot triangle corners + barycentrics
function scatter(mesh: THREE.Mesh, perM2: number, cap: number, r: () => number, m: THREE.Matrix4) {
  const g = mesh.geometry as THREE.BufferGeometry;
  const pos = g.getAttribute('position'), idx = g.getIndex()!;
  const tris = idx.count / 3;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const cum = new Float64Array(tris);
  let total = 0;
  for (let t = 0; t < tris; t++) {
    a.fromBufferAttribute(pos, idx.getX(t * 3)).applyMatrix4(m);
    b.fromBufferAttribute(pos, idx.getX(t * 3 + 1)).applyMatrix4(m);
    c.fromBufferAttribute(pos, idx.getX(t * 3 + 2)).applyMatrix4(m);
    total += b.sub(a).cross(c.sub(a)).length() / 2;
    cum[t] = total;
  }
  const n = Math.min(cap, Math.round(total * perM2));
  const tri = new Uint32Array(n * 3), bary = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const x = r() * total;
    let lo = 0, hi = tris - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < x) lo = mid + 1; else hi = mid; }
    let u = r(), v = r();
    if (u + v > 1) { u = 1 - u; v = 1 - v; }
    for (let k = 0; k < 3; k++) tri[i * 3 + k] = idx.getX(lo * 3 + k);
    bary[i * 3] = 1 - u - v; bary[i * 3 + 1] = u; bary[i * 3 + 2] = v;
  }
  return { n, tri, bary };
}

// dots for one or more parts: [x,y,z,size,tint,seed] in the frame `m` maps to, plus the scatter so
// animated parts can re-evaluate positions per key
function paint(parts: Part[], role: Role, perM2: number, cap: number, size: [number, number], coat: number, dir: number, r: () => number) {
  const sun = dir > 0 ? SUN.clone() : new THREE.Vector3(-SUN.x, SUN.y, -SUN.z); // sun in the rig's frame
  const out: number[] = [];
  const scatters = parts.map(({ mesh, m }) => {
    const s = scatter(mesh, perM2, cap, r, m);
    const g = mesh.geometry as THREE.BufferGeometry;
    const pos = g.getAttribute('position'), col = g.getAttribute('color');
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), p = new THREE.Vector3(), nrm = new THREE.Vector3();
    for (let i = 0; i < s.n; i++) {
      const [ia, ib, ic] = [s.tri[i * 3], s.tri[i * 3 + 1], s.tri[i * 3 + 2]];
      const [wa, wb, wc] = [s.bary[i * 3], s.bary[i * 3 + 1], s.bary[i * 3 + 2]];
      a.fromBufferAttribute(pos, ia).applyMatrix4(m);
      b.fromBufferAttribute(pos, ib).applyMatrix4(m);
      c.fromBufferAttribute(pos, ic).applyMatrix4(m);
      p.set(0, 0, 0).addScaledVector(a, wa).addScaledVector(b, wb).addScaledVector(c, wc);
      nrm.subVectors(b, a).cross(c.clone().sub(a)).normalize();
      const light = 0.3 + 0.6 * Math.abs(nrm.dot(sun)); // winding isn't reliable, so either face of a panel
      const cr = col.getX(ia) * wa + col.getX(ib) * wb + col.getX(ic) * wc;
      const cg = col.getY(ia) * wa + col.getY(ib) * wb + col.getY(ic) * wc;
      const cb = col.getZ(ia) * wa + col.getZ(ib) * wb + col.getZ(ic) * wc;
      const dot = { r: cr, g: cg, b: cb, light, y: p.y, up: Math.abs(nrm.y), coat };
      out.push(p.x, p.y, p.z, size[0] + r() * (size[1] - size[0]), tintFor(role, dot, r), r());
    }
    return s;
  });
  return { arr: out, scatters };
}

// the horse's dots at every key, both horses back to back: KEYS × (dots × 3)
function horseKeys(parts: Part[], scatters: ReturnType<typeof scatter>[]) {
  const total = scatters.reduce((n, s) => n + s.n, 0);
  const keys = Array.from({ length: KEYS }, () => new Float32Array(total * 3));
  const v = new THREE.Vector3(), q = new THREE.Vector3(), q2 = new THREE.Vector3();
  parts.forEach(({ mesh, m }, pi) => {
    const g = mesh.geometry as THREE.BufferGeometry;
    const base = g.getAttribute('position');
    const morphs = g.morphAttributes.position!;
    const off = scatters.slice(0, pi).reduce((n, s) => n + s.n, 0);
    const s = scatters[pi];
    for (let k = 0; k < KEYS; k++) {
      const d = morphs[k];
      for (let i = 0; i < s.n; i++) {
        q.set(0, 0, 0);
        for (let j = 0; j < 3; j++) {
          const vi = s.tri[i * 3 + j];
          v.fromBufferAttribute(base, vi);
          if (g.morphTargetsRelative) v.add(q2.fromBufferAttribute(d, vi));
          else v.fromBufferAttribute(d, vi);
          q.addScaledVector(v, s.bary[i * 3 + j]);
        }
        q.applyMatrix4(m);
        keys[k].set([q.x, q.y, q.z], (off + i) * 3);
      }
    }
  });
  return keys;
}

type Rig = {
  state: Carriage;
  body: THREE.BufferGeometry;
  horses: THREE.BufferGeometry;
  keys: Float32Array[];
  phase: number; // where in the stride it starts, so the teams don't walk in step
  wheels: { geo: THREE.BufferGeometry; hub: THREE.Vector3; radius: number }[];
};

function build(scene: THREE.Group, f: (typeof FLEET)[number], seed: number): Rig {
  scene.updateMatrixWorld(true);
  const root = scene.getObjectByName('carriage')!;
  // measure from the glTF scene, not the 'carriage' node: that node holds the turn that puts the
  // horses ahead along +x
  const inv = scene.matrixWorld.clone().invert();
  const part = (name: string): Part => {
    const mesh = scene.getObjectByName(name) as THREE.Mesh;
    return { mesh, m: inv.clone().multiply(mesh.matrixWorld) };
  };
  const r = rand(seed);
  const body = paint([part('body')], 'coach', 320, 14000, [0.08, 0.14], 0, f.dir, r);
  const hp = [part('horse_r'), part('horse_l')];
  const horses = paint(hp, 'horse', 300, 1600, [0.08, 0.13], f.coat, f.dir, r);
  const driver = paint([part('driver')], 'driver', 600, 1200, [0.06, 0.1], 0, f.dir, r);
  const keys = horseKeys(hp, horses.scatters);
  const radii = (root.userData.wheelRadius as number[]) ?? [0.51, 0.64];
  const wheels = ['wheels_front', 'wheels_rear'].map((name, i) => {
    const { arr } = paint([part(name)], 'coach', 900, 1400, [0.05, 0.08], 0, f.dir, r);
    // spin about the hub: the dots' bounding-box centre
    const box = new THREE.Box3();
    for (let k = 0; k < arr.length; k += 6) box.expandByPoint(new THREE.Vector3(arr[k], arr[k + 1], arr[k + 2]));
    const hub = box.getCenter(new THREE.Vector3());
    for (let k = 0; k < arr.length; k += 6) { arr[k] -= hub.x; arr[k + 1] -= hub.y; arr[k + 2] -= hub.z; }
    return { geo: dabGeo(arr), hub, radius: radii[i] };
  });
  const horseGeo = dabGeo(horses.arr);
  (horseGeo.getAttribute('position') as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage);
  const stride = (root.userData.strideMetres as number) ?? 1.27, period = (root.userData.strideSeconds as number) ?? 1.28;
  return {
    state: { x: f.x, z: euclidCentreZ(f.x) + f.dir * LANE, dir: f.dir, speed: (stride / period) * GAIT, lastPass: -1e9 },
    body: dabGeo([...body.arr, ...driver.arr]),
    horses: horseGeo,
    keys,
    phase: r(),
    wheels,
  };
}

function CarriageRig({ rig, mat }: { rig: Rig; mat: THREE.Material }) {
  const group = useRef<THREE.Group>(null);
  const spin = useRef<(THREE.Group | null)[]>([]);
  const phase = useRef(rig.phase);
  const s = rig.state;
  useFrame((_, dt0) => {
    const dt = Math.min(dt0, 0.1);
    s.x += s.dir * s.speed * dt;
    if (s.x > X1) s.x = X0;
    if (s.x < X0) s.x = X1;
    s.z = euclidCentreZ(s.x) + s.dir * LANE;
    group.current?.position.set(s.x, 0, s.z);
    rig.wheels.forEach((w, i) => { const g = spin.current[i]; if (g) g.rotation.z -= (s.speed * dt) / w.radius; });
    // walk: blend the two nearest keys of the stride
    const period = 1.28 / GAIT;
    phase.current = (phase.current + dt / period) % 1;
    const t = phase.current * KEYS, k0 = Math.floor(t) % KEYS, k1 = (k0 + 1) % KEYS, w = t - Math.floor(t);
    const a = rig.keys[k0], b = rig.keys[k1];
    const attr = rig.horses.getAttribute('position') as THREE.BufferAttribute;
    const p = attr.array as Float32Array;
    for (let i = 0; i < p.length; i++) p[i] = a[i] + (b[i] - a[i]) * w;
    attr.needsUpdate = true;
  });
  return (
    <group ref={group} rotation-y={s.dir > 0 ? 0 : Math.PI}>
      <points geometry={rig.body} material={mat} renderOrder={2} />
      <points geometry={rig.horses} material={mat} renderOrder={2} />
      {rig.wheels.map((w, i) => (
        <group key={i} position={w.hub} ref={(g) => { spin.current[i] = g; }}>
          <points geometry={w.geo} material={mat} renderOrder={2} />
        </group>
      ))}
    </group>
  );
}

export function Carriages() {
  const gltf = useGLTF(URL);
  const rigs = useMemo(() => FLEET.map((f, i) => build(gltf.scene, f, 7001 + i * 131)), [gltf]);
  useEffect(() => {
    traffic.length = 0;
    traffic.push(...rigs.map((r) => r.state));
    return () => {
      traffic.length = 0;
      rigs.forEach((r) => [r.body, r.horses, ...r.wheels.map((w) => w.geo)].forEach((g) => g.dispose()));
    };
  }, [rigs]);
  const mat = useMemo(() => makeDabMaterial({ solid: true, role: 'kit' }), []);
  return (
    <group>
      {rigs.map((rig, i) => <CarriageRig key={i} rig={rig} mat={mat} />)}
    </group>
  );
}

useGLTF.preload(URL);
