import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { U } from '../gl/uniforms';
import { sound } from '../audio/engine';
import { rig } from './kit';
import { player, threadState } from './player';

type Bed = { stop: (s?: number) => void; gain: GainNode } | 'pending';

// Inside the Canvas: while a thread plays, its rig drives the camera, the grade and the ambience.
export function ThreadStage() {
  const { camera, scene } = useThree();
  const beds = useRef(new Map<string, Bed>());
  const night = useMemo(() => new THREE.Color(), []);
  const last = useRef({ duck: -1, music: -1, street: -1, active: false, gen: 0 });

  useEffect(() => () => { for (const b of beds.current.values()) if (b !== 'pending') b.stop(0.3); }, []);

  useFrame(() => {
    const l = last.current;
    if (!threadState.active) {
      if (l.active) {
        // a thread just ended: let go of its beds and the grade
        for (const b of beds.current.values()) if (b !== 'pending') b.stop(1.5);
        beds.current.clear();
        if (scene.background instanceof THREE.Color) scene.background.copy(U.uPaper.value);
        document.documentElement.style.setProperty('--night', '0');
        l.active = false; l.duck = l.music = l.street = -1;
      }
      return;
    }
    l.active = true;
    if (l.gen !== rig.gen) {
      for (const b of beds.current.values()) if (b !== 'pending') b.stop(0.8);
      beds.current.clear();
      l.gen = rig.gen; l.duck = l.music = l.street = -1;
    }
    const cam = camera as THREE.PerspectiveCamera;
    cam.position.copy(rig.pos);
    cam.lookAt(rig.tgt);
    if (Math.abs(cam.fov - rig.fov) > 1e-3) { cam.fov = rig.fov; cam.updateProjectionMatrix(); }

    // the night grade reaches the clear colour and the paper vignette too
    if (scene.background instanceof THREE.Color) scene.background.copy(U.uPaper.value).lerp(night.copy(U.uPaper.value).multiply(U.uNightTint.value).multiplyScalar(0.75), U.uNight.value);
    document.documentElement.style.setProperty('--night', U.uNight.value.toFixed(3));

    // ambience: only touch the audio graph when a level actually moves
    sound.quiet = rig.quiet > 0.5;
    if (Math.abs(rig.duck - l.duck) > 0.01) { sound.duck(rig.duck, 0.15); l.duck = rig.duck; }
    const m = rig.music > 0.5 ? 1 : 0;
    if (m !== l.music) { sound.setMusicOff(!m); l.music = m; }
    if (rig.street !== l.street) { sound.setMode(rig.street ? 'street' : 'map'); l.street = rig.street; }
    if (sound.enabled) {
      for (const [name, gain] of Object.entries(rig.beds)) {
        const b = beds.current.get(name);
        if (gain > 0.002 && !b) {
          beds.current.set(name, 'pending');
          sound.threadLoop(name, gain, { ...rig.bedOpts[name], fadeIn: 0.8 }).then((h) => { if (h) beds.current.set(name, h); else beds.current.delete(name); });
        } else if (b && b !== 'pending') {
          if (gain <= 0.002) { b.stop(0.6); beds.current.delete(name); }
          else b.gain.gain.setTargetAtTime(gain, sound.ctx!.currentTime, 0.1);
        }
      }
    }
    player.sync();
  });
  return null;
}
