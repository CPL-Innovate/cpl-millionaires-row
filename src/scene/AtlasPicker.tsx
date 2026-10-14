import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { PLATE } from '../data/site';
import { lotAt } from '../gl/lots';

// Atlas: which lot is under the pointer (ray onto the ground → plate px → lot outline), and a
// click that wasn't a drag picks it.
export function AtlasPicker({ active, onHover, onPick }: { active: boolean; onHover: (i: number) => void; onPick: (i: number) => void }) {
  const { camera, gl } = useThree();
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  useEffect(() => {
    if (!active) { onHover(-1); return; }
    const el = gl.domElement;
    const hit = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
      const p = ray.ray.intersectPlane(plane, new THREE.Vector3());
      return p ? lotAt(p.x / PLATE.metresPerPx + PLATE.widthPx / 2, p.z / PLATE.metresPerPx + PLATE.heightPx / 2) : -1;
    };
    let down: [number, number] | null = null;
    const move = (e: PointerEvent) => { if (!down) onHover(hit(e)); };
    const pd = (e: PointerEvent) => { down = [e.clientX, e.clientY]; };
    const pu = (e: PointerEvent) => {
      if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 5) { const i = hit(e); if (i >= 0) onPick(i); }
      down = null;
    };
    const leave = () => onHover(-1);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerdown', pd);
    el.addEventListener('pointerup', pu);
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerdown', pd);
      el.removeEventListener('pointerup', pu);
      el.removeEventListener('pointerleave', leave);
    };
  }, [active, camera, gl, ray, plane, onHover, onPick]);
  return null;
}
