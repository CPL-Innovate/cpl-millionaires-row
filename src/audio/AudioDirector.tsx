import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { BUILDINGS, CASE, EUCLID, euclidCentreZ, plateToWorld } from '../data/site';
import { walkState } from '../scene/walk';
import { traffic } from '../scene/traffic';
import { sound, type Surface } from './engine';

// Inside the Canvas: keeps the Web Audio listener on the camera, the windmill and the nearest gas
// lamp in place, and plays footsteps for what you're walking on.

// same placement rules as the street kit in scene/World.tsx
const LAMPS: [number, number, number][] = [];
for (let x = -246; x <= 140; x += 36) {
  if (Math.abs(x) < 14) continue;
  for (const side of [-1, 1]) LAMPS.push([x, 3.6, euclidCentreZ(x) + side * (EUCLID.roadHalf + 0.6)]);
}

function surfaceAt(x: number, z: number): Surface {
  const de = Math.abs(z - euclidCentreZ(x)), dc = Math.abs(x);
  if (de < EUCLID.roadHalf || dc < CASE.roadHalf) return 'dirt';
  if (de < EUCLID.rowHalf || dc < CASE.rowHalf) return 'flagstone';
  return 'lawn';
}

export function AudioDirector() {
  const fwd = useMemo(() => new THREE.Vector3(), []);
  const nextStep = useRef(0);
  const windmill = useMemo<[number, number, number]>(() => {
    const brush = BUILDINGS.find((b) => b.id === 'brush')!;
    const [bx, bz] = plateToWorld(brush.plate[0], brush.plate[1]);
    return [bx - 22, 19, bz - 30];
  }, []);

  useFrame(({ camera, clock }) => {
    if (!sound.enabled) return;
    const p = camera.position;
    camera.getWorldDirection(fwd);
    sound.setListener([p.x, p.y, p.z], [fwd.x, fwd.y, fwd.z]);
    sound.noteListener(p.x, p.z);
    sound.placeWindmill(windmill);
    let best = LAMPS[0], bd = Infinity;
    for (const l of LAMPS) {
      const d = (l[0] - p.x) ** 2 + (l[2] - p.z) ** 2;
      if (d < bd) { bd = d; best = l; }
    }
    sound.placeLamp(best);
    const t = clock.elapsedTime;
    // a carriage ~7 s from drawing level with you: start its pass so the peak lands as it goes by
    for (const c of traffic) {
      const ahead = (p.x - c.x) * c.dir;
      if (ahead > c.speed * 6.5 && ahead < c.speed * 7.5 && Math.abs(p.z - c.z) < 40 && t - c.lastPass > 20) {
        c.lastPass = t;
        sound.carriage(c);
      }
    }
    // footsteps at a walking (or hurrying) cadence while the visitor is moving
    if (walkState.moving && t >= nextStep.current) {
      sound.step(surfaceAt(p.x, p.z), walkState.hurry);
      nextStep.current = t + (walkState.hurry ? 0.32 : 0.5) * (0.95 + Math.random() * 0.1);
    } else if (!walkState.moving) nextStep.current = Math.max(nextStep.current, t + 0.12); // first step lands just after you set off
  });
  return null;
}
