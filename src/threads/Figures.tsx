import { useEffect, useMemo, useReducer, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { rig, type FigureKind } from './kit';

// Threads: people the record doesn't show, drawn explicitly as pencil sketches (never photo-real):
// a walker, a crowd, a sleigh. Camera-facing sprites from a canvas, two frames of stride.
// Each is placed by rig.figures (tweened on the thread's timeline).

const SIZE: Record<FigureKind, [number, number]> = { walker: [0.95, 1.85], crowd: [0.9, 1.75], sleigh: [5.2, 2.4], flag: [0.9, 2.6] };

function draw(kind: FigureKind, frame: number, seed: number) {
  const c = document.createElement('canvas');
  const [w, h] = SIZE[kind];
  c.width = Math.round(w * 140); c.height = Math.round(h * 140);
  const g = c.getContext('2d')!;
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const X = (x: number) => x * c.width, Y = (y: number) => (1 - y) * c.height;
  // a wobbly pencil stroke, drawn twice slightly apart
  const stroke = (pts: [number, number][], width = 3.4, alpha = 0.9) => {
    for (let pass = 0; pass < 2; pass++) {
      g.beginPath();
      pts.forEach(([x, y], i) => {
        const jx = (rnd() - 0.5) * 2.2, jy = (rnd() - 0.5) * 2.2;
        if (i === 0) g.moveTo(X(x) + jx, Y(y) + jy); else g.lineTo(X(x) + jx, Y(y) + jy);
      });
      g.lineWidth = width * (pass ? 0.6 : 1);
      g.strokeStyle = `rgba(52, 48, 44, ${alpha * (pass ? 0.5 : 1)})`;
      g.lineCap = 'round'; g.lineJoin = 'round';
      g.stroke();
    }
  };
  const hatch = (x0: number, y0: number, x1: number, y1: number, n: number) => {
    for (let i = 0; i < n; i++) { const t = i / n; stroke([[x0 + (x1 - x0) * t, y0], [x0 + (x1 - x0) * t + 0.12, y1]], 1, 0.35); }
  };
  if (kind === 'walker' || kind === 'crowd') {
    const open = frame === 0 ? 0.13 : 0.03;
    const hat = kind === 'walker' || rnd() < 0.5;
    // head, hat, coat, legs in stride, an arm
    g.beginPath(); g.ellipse(X(0.5), Y(0.86), c.width * 0.09, c.height * 0.045, 0, 0, Math.PI * 2);
    g.lineWidth = 3.2; g.strokeStyle = 'rgba(52,48,44,0.9)'; g.stroke();
    if (hat) { stroke([[0.38, 0.9], [0.62, 0.9]]); stroke([[0.42, 0.9], [0.43, 1.0], [0.57, 1.0], [0.58, 0.9]]); }
    else stroke([[0.37, 0.9], [0.5, 0.97], [0.63, 0.9]]);
    stroke([[0.5, 0.81], [0.33, 0.62], [0.3, 0.38], [0.7, 0.38], [0.67, 0.62], [0.5, 0.81]]);
    hatch(0.34, 0.4, 0.62, 0.62, 6);
    stroke([[0.42, 0.38], [0.5 - open, 0.02]]);
    stroke([[0.58, 0.38], [0.5 + open, 0.02]]);
    stroke([[0.36, 0.66], [0.3 - open * 0.6, 0.42]], 1.8);
    if (kind === 'walker') stroke([[0.68, 0.6], [0.8, 0.3], [0.82, 0.02]], 1.4); // a walking stick
  } else if (kind === 'sleigh') {
    // runners, the curved body, a driver, a trotter in stride
    stroke([[0.04, 0.08], [0.55, 0.08], [0.6, 0.16]]);
    stroke([[0.12, 0.12], [0.1, 0.42], [0.2, 0.52], [0.48, 0.48], [0.5, 0.14]]);
    hatch(0.12, 0.16, 0.46, 0.44, 7);
    g.beginPath(); g.ellipse(X(0.3), Y(0.72), c.width * 0.025, c.height * 0.05, 0, 0, Math.PI * 2); g.lineWidth = 2; g.stroke();
    stroke([[0.3, 0.66], [0.27, 0.5]]); stroke([[0.32, 0.6], [0.62, 0.55]], 1.2); // reins
    const o = frame === 0 ? 0.04 : -0.03;
    stroke([[0.62, 0.55], [0.9, 0.55], [0.97, 0.7], [0.92, 0.75]]); // back, neck, head
    stroke([[0.65, 0.55], [0.63 - o, 0.08]]); stroke([[0.7, 0.55], [0.72 + o, 0.08]]);
    stroke([[0.84, 0.55], [0.82 + o, 0.08]]); stroke([[0.88, 0.55], [0.92 - o, 0.08]]);
    stroke([[0.55, 0.12], [0.62, 0.55]], 1.2); // shaft
  } else {
    // a red flag on a pole
    stroke([[0.15, 0.0], [0.15, 1.0]], 2.4);
    g.beginPath(); g.moveTo(X(0.15), Y(0.98)); g.quadraticCurveTo(X(0.55), Y(1.0 - frame * 0.06), X(0.92), Y(0.9)); g.lineTo(X(0.85), Y(0.66)); g.quadraticCurveTo(X(0.5), Y(0.7 + frame * 0.05), X(0.15), Y(0.68)); g.closePath();
    g.fillStyle = 'rgba(178, 52, 38, 0.85)'; g.fill();
    stroke([[0.15, 0.98], [0.55, 0.97], [0.92, 0.9], [0.85, 0.66], [0.15, 0.68]], 1.4);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function Figure({ id }: { id: string }) {
  const f = rig.figures[id];
  const ref = useRef<THREE.Sprite>(null);
  const { mats } = useMemo(() => {
    const seed = [...id].reduce((a, ch) => a + ch.charCodeAt(0), 0);
    const mats = [0, 1].map((fr) => new THREE.SpriteMaterial({ map: draw(f.kind, fr, seed), transparent: true, depthWrite: false, opacity: 0 }));
    return { mats };
  }, [id, f.kind]);
  useEffect(() => () => mats.forEach((m) => { m.map?.dispose(); m.dispose(); }), [mats]);
  const last = useRef({ x: f.x, z: f.z, step: 0 });
  useFrame((_, dt) => {
    const s = ref.current;
    if (!s) return;
    const moved = Math.hypot(f.x - last.current.x, f.z - last.current.z);
    last.current.step += moved / 0.55 + (f.kind === 'flag' ? dt * 3 : 0);
    last.current.x = f.x; last.current.z = f.z;
    const m = mats[Math.floor(last.current.step) % 2];
    m.opacity = f.o;
    s.material = m;
    const [w, h] = SIZE[f.kind];
    s.scale.set(w * f.s * (f.flip ? -1 : 1), h * f.s, 1);
    s.position.set(f.x, (h * f.s) / 2 + f.y, f.z);
    s.visible = f.o > 0.01;
  });
  return <sprite ref={ref} renderOrder={5} />;
}

// the set of figures changes only when a thread starts (each thread declares its own)
export function Figures() {
  const ids = useRef<{ gen: number; ids: string[] }>({ gen: -1, ids: [] });
  const [, force] = useReducer((x: number) => x + 1, 0);
  useFrame(() => {
    const now = Object.keys(rig.figures);
    if (ids.current.gen !== rig.gen || now.length !== ids.current.ids.length) { ids.current = { gen: rig.gen, ids: now }; force(); }
  });
  return <group>{ids.current.ids.map((id) => <Figure key={`${ids.current.gen}-${id}`} id={id} />)}</group>;
}
