import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { makeStreetLabelMaterial } from '../gl/materials';
import { U } from '../gl/uniforms';

// The Atlas's street names, lettered on the roadway in the engraving's italic. Each time the Atlas
// comes up the curbs draw out from the corner and then the names write themselves in, one by one.
// x/z: centre in world metres; along: 'x' reads west → east, 'z' north → south (so, with the
// Atlas looking east, Euclid's names read up the page and E. 40th's across it, left to right).
const LABELS = [
  { text: 'Euclid Avenue', x: -75, z: 0, along: 'x' as const },
  { text: 'Euclid Avenue', x: 50, z: 0, along: 'x' as const },
  { text: 'E. 40th Street', x: 0, z: 70, along: 'z' as const }, // Case Avenue in 1888; lettered by its modern name
];
const CAP = 6.5; // letter height on the ground, metres (Euclid's roadway is 18 m)

// hand-set: each letter placed on its own, widely spaced, with a slight lean and drift
function letter(text: string, seed: number) {
  const px = 160, h = 256, track = px * 0.3;
  const c = document.createElement('canvas');
  const g = c.getContext('2d')!;
  const font = `italic ${px}px "IM Fell English", "EB Garamond", Georgia, serif`;
  g.font = font;
  const chars = [...text.toUpperCase()];
  const widths = chars.map((ch) => g.measureText(ch).width);
  const w = Math.ceil(widths.reduce((a, b) => a + b, 0) + track * (chars.length - 1) + px * 0.4);
  c.width = w; c.height = h;
  g.font = font;
  g.fillStyle = '#fff';
  g.textBaseline = 'alphabetic';
  let x = px * 0.2, s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647) - 0.5;
  chars.forEach((ch, i) => {
    g.save();
    g.translate(x, h * 0.74 + rnd() * 6);
    g.rotate(rnd() * 0.05);
    g.fillText(ch, 0, 0);
    g.restore();
    x += widths[i] + track;
  });
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  return { tex: t, aspect: w / h };
}

export function AtlasLabels({ show }: { show: boolean }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    document.fonts.load('italic 160px "IM Fell English"').finally(() => live && setReady(true));
    return () => { live = false; };
  }, []);
  const labels = useMemo(() => {
    if (!ready) return [];
    return LABELS.map((l, i) => {
      const { tex, aspect } = letter(l.text, 911 + i * 37);
      const h = CAP / 0.62; // the canvas is taller than the capitals
      return { ...l, tex, w: h * aspect, h, mat: makeStreetLabelMaterial(tex, i * 1.7) };
    });
  }, [ready]);
  useEffect(() => () => labels.forEach((l) => { l.tex.dispose(); l.mat.dispose(); }), [labels]);

  // curbs first, then each name in turn; hidden again when the Atlas goes
  useEffect(() => {
    const ts = labels.map((l) => l.mat.uniforms.uT);
    if (!show) {
      gsap.killTweensOf([U.uStreetDraw, ...ts]);
      U.uStreetDraw.value = 0;
      ts.forEach((t) => (t.value = 0));
      return;
    }
    const tl = gsap.timeline({ delay: 0.9 });
    tl.to(U.uStreetDraw, { value: 1, duration: 2.4, ease: 'power1.inOut' }, 0);
    ts.forEach((t, i) => tl.to(t, { value: 1, duration: 2.2, ease: 'power1.inOut' }, 0.9 + i * 0.7));
    return () => { tl.kill(); };
  }, [show, labels]);

  return (
    <group>
      {labels.map((l, i) => (
        <mesh key={i} material={l.mat} renderOrder={5}
          position={[l.x, 0.08, l.z]}
          rotation={l.along === 'x' ? [-Math.PI / 2, 0, 0] : [-Math.PI / 2, 0, -Math.PI / 2]}>
          <planeGeometry args={[l.w, l.h]} />
        </mesh>
      ))}
    </group>
  );
}
