import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { MapControls } from '@react-three/drei';
import type { MapControls as MapControlsImpl } from 'three-stdlib';
import gsap from 'gsap';
import { walkState } from './walk';
import { STATIONS, type Station } from '../data/site';
import { lotCentre } from '../gl/lots';
import { U } from '../gl/uniforms';

export type Mode = 'map' | 'street';
export type MapStyle = 'atlas' | 'plate';

// the flat plate is read from nearly overhead; the Atlas is a bird's-eye from the west looking east,
// so Euclid runs up the middle of the page (west at the foot, east at the head, north on the left),
// low enough to see walls and crowns
const FRAMES: Record<MapStyle, { pos: THREE.Vector3; target: THREE.Vector3 }> = {
  plate: { pos: new THREE.Vector3(-40, 440, 120), target: new THREE.Vector3(-40, 0, -10) },
  atlas: { pos: new THREE.Vector3(-273, 175, 0), target: new THREE.Vector3(-15, 0, 0) },
};
// where the Atlas can be panned to (the plate's built-up middle)
const PAN = { x0: -240, x1: 150, z0: -170, z1: 150 };
const EYE = 1.7;

function yawPitchTo(from: THREE.Vector3, to: THREE.Vector3) {
  const d = to.clone().sub(from);
  const yaw = Math.atan2(-d.x, -d.z);
  const pitch = Math.atan2(d.y, Math.hypot(d.x, d.z));
  return { yaw, pitch };
}

interface Props {
  mode: Mode;
  mapStyle: MapStyle;
  focusLot: number; // Atlas: fly to this lot (−1: none)
  stationId: string;
  onArrive: (s: Station) => void;
}

export function CameraRig({ mode, mapStyle, focusLot, stationId, onArrive }: Props) {
  const { camera, gl } = useThree();
  const controls = useRef<MapControlsImpl>(null);
  const look = useRef({ yaw: 0, pitch: 0 });
  const tweening = useRef(false);
  const keys = useRef<Record<string, boolean>>({});
  // eye height: a station's own (its photographer's) until you walk off, then a standing visitor's
  const eye = useRef(EYE);
  const prevMode = useRef<Mode>('map');
  const lookTarget = useMemo(() => FRAMES[mapStyle].target.clone(), []); // eslint-disable-line react-hooks/exhaustive-deps
  const mapTarget = useMemo(() => FRAMES[mapStyle].target.clone(), []); // eslint-disable-line react-hooks/exhaustive-deps
  // MapControls calls update() every frame even when disabled (it re-aims the camera at its
  // target), so it only exists while we are actually on the plate.
  const [mapControls, setMapControls] = useState(true);

  // initial map framing
  useEffect(() => {
    camera.position.copy(FRAMES[mapStyle].pos);
    camera.lookAt(FRAMES[mapStyle].target);
    U.uAtlas.value = mapStyle === 'atlas' ? 1 : 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera]);

  // on the map, switching style glides between the two framings and blotches the drawing in/out
  const prevStyle = useRef(mapStyle);
  useEffect(() => {
    if (prevStyle.current === mapStyle) return;
    prevStyle.current = mapStyle;
    if (mode !== 'map') return;
    const f = FRAMES[mapStyle];
    const tgt = controls.current?.target ?? mapTarget;
    const tl = gsap.timeline();
    tl.to(camera.position, { x: f.pos.x, y: f.pos.y, z: f.pos.z, duration: 1.8, ease: 'power2.inOut' }, 0)
      .to(tgt, { x: f.target.x, y: f.target.y, z: f.target.z, duration: 1.8, ease: 'power2.inOut', onUpdate: () => controls.current?.update() }, 0)
      .to(U.uAtlas, { value: mapStyle === 'atlas' ? 1 : 0, duration: 1.4, ease: 'power1.inOut' }, mapStyle === 'atlas' ? 0.5 : 0);
    return () => { tl.kill(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapStyle]);

  // Atlas: fly to a lot, keeping the current bearing, a little closer in
  useEffect(() => {
    if (focusLot < 0 || mode !== 'map' || mapStyle !== 'atlas' || !controls.current) return;
    const [x, z] = lotCentre(focusLot);
    const c = controls.current;
    const off = camera.position.clone().sub(c.target);
    off.setLength(THREE.MathUtils.clamp(off.length(), 150, 230));
    const tl = gsap.timeline({ onUpdate: () => c.update() });
    tl.to(c.target, { x, y: 0, z, duration: 1.6, ease: 'power2.inOut' }, 0)
      .to(camera.position, { x: x + off.x, y: off.y, z: z + off.z, duration: 1.6, ease: 'power2.inOut' }, 0);
    return () => { tl.kill(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusLot]);

  // drag-to-look + WASD in street mode
  useEffect(() => {
    const el = gl.domElement;
    let dragging = false, lx = 0, ly = 0;
    const down = (e: PointerEvent) => { dragging = true; lx = e.clientX; ly = e.clientY; };
    const up = () => { dragging = false; };
    const move = (e: PointerEvent) => {
      if (!dragging || mode !== 'street' || tweening.current) return;
      look.current.yaw += (e.clientX - lx) * 0.0032;
      look.current.pitch = THREE.MathUtils.clamp(look.current.pitch + (e.clientY - ly) * 0.0028, -0.9, 1.1);
      lx = e.clientX; ly = e.clientY;
    };
    const kd = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = true; };
    const ku = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointermove', move);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
    };
  }, [gl, mode]);

  // transitions: map → street (descend + draw outward), street → station, street → map
  useEffect(() => {
    if (mode === 'map' && prevMode.current === 'map') return; // first mount: already framed on the plate
    const station = STATIONS.find((s) => s.id === stationId) ?? STATIONS[0];
    const to = new THREE.Vector3(...station.position);
    const tgt = new THREE.Vector3(...station.target);
    const end = yawPitchTo(to, tgt);
    const tl = gsap.timeline();
    tweening.current = true;

    if (mode === 'street') {
      setMapControls(false);
      const fromMap = prevMode.current === 'map';
      if (fromMap) {
        U.uRevealCenter.value.set(to.x, to.z);
        U.uRevealRadius.value = 0;
        U.uStreet.value = 1;
        // swoop down over the plate, keep looking at the target, then hand over to the walker
        const mid = new THREE.Vector3().lerpVectors(camera.position, to, 0.55).setY(90);
        lookTarget.copy(controls.current?.target ?? mapTarget);
        camera.lookAt(lookTarget);
        tl.to(camera.position, { x: mid.x, y: mid.y, z: mid.z, duration: 1.6, ease: 'power2.inOut' })
          .to(lookTarget, { x: tgt.x, y: tgt.y, z: tgt.z, duration: 3.0, ease: 'power2.inOut' }, 0)
          .to(camera.position, { x: to.x, y: to.y, z: to.z, duration: 1.8, ease: 'power3.out' }, 1.4)
          .to(U.uRevealRadius, { value: 650, duration: 6.5, ease: 'power1.in' }, 0.6);
        tl.eventCallback('onUpdate', () => { if (tweening.current) camera.lookAt(lookTarget); });
      } else {
        // walk-cut between stations: glide and turn
        const start = { ...look.current };
        let dy = end.yaw - start.yaw;
        dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        const p = { t: 0 };
        const from = camera.position.clone();
        tl.to(p, {
          t: 1,
          duration: Math.min(3.2, 1.2 + from.distanceTo(to) / 60),
          ease: 'power2.inOut',
          onUpdate: () => {
            camera.position.lerpVectors(from, to, p.t);
            look.current.yaw = start.yaw + dy * p.t;
            look.current.pitch = start.pitch + (end.pitch - start.pitch) * p.t;
            camera.rotation.set(look.current.pitch, look.current.yaw, 0, 'YXZ');
          },
        });
      }
      // arrive when the camera lands; the drawing keeps spreading outward behind us
      tl.call(() => {
        gsap.to(U.uAtlas, { value: 0, duration: 1.2, ease: 'power1.in' }); // the paint has the street now
        look.current = { ...end };
        eye.current = to.y;
        camera.rotation.set(end.pitch, end.yaw, 0, 'YXZ');
        tweening.current = false;
        onArrive(station);
      }, [], fromMap ? 3.2 : undefined);
    } else {
      // back to the plate: the drawing un-draws toward the camera, then we lift off
      U.uRevealCenter.value.set(camera.position.x, camera.position.z);
      lookTarget.copy(camera.position).add(new THREE.Vector3(0, 0, -10).applyEuler(camera.rotation));
      const f = FRAMES[mapStyle];
      mapTarget.copy(f.target);
      tl.to(U.uRevealRadius, { value: 0, duration: 1.8, ease: 'power2.in' })
        .to(U.uAtlas, { value: mapStyle === 'atlas' ? 1 : 0, duration: 1.2, ease: 'power1.inOut' }, 0)
        .to(camera.position, { x: f.pos.x, y: f.pos.y, z: f.pos.z, duration: 2.2, ease: 'power2.inOut' }, 0.6)
        .to(lookTarget, { x: f.target.x, y: f.target.y, z: f.target.z, duration: 2.2, ease: 'power2.inOut' }, 0.6)
        .set(U.uStreet, { value: 0 });
      tl.eventCallback('onUpdate', () => camera.lookAt(lookTarget));
      tl.eventCallback('onComplete', () => {
        tweening.current = false;
        setMapControls(true);
      });
    }
    prevMode.current = mode;
    return () => {
      tl.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, stationId]);

  // dev: set a street pose by hand (photo matching): __pose([x, y, z], [tx, ty, tz])
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as { __cam: unknown }).__cam = camera;
    (window as unknown as { __pose: unknown }).__pose = (p: [number, number, number], t: [number, number, number]) => {
      const from = new THREE.Vector3(...p);
      camera.position.copy(from);
      eye.current = p[1];
      look.current = yawPitchTo(from, new THREE.Vector3(...t));
    };
  }, [camera]);

  useFrame((_, dt) => {
    walkState.moving = false;
    if (mode !== 'street' || tweening.current) return;
    const k = keys.current;
    const speed = (k['shift'] ? 14 : 5) * dt;
    const f = (k['w'] || k['arrowup'] ? 1 : 0) - (k['s'] || k['arrowdown'] ? 1 : 0);
    const r = (k['d'] || k['arrowright'] ? 1 : 0) - (k['a'] || k['arrowleft'] ? 1 : 0);
    walkState.moving = f !== 0 || r !== 0;
    if (walkState.moving) eye.current += (EYE - eye.current) * Math.min(1, dt * 3);
    walkState.hurry = !!k['shift'];
    const yaw = look.current.yaw;
    camera.position.x += (-Math.sin(yaw) * f + Math.cos(yaw) * r) * speed;
    camera.position.z += (-Math.cos(yaw) * f - Math.sin(yaw) * r) * speed;
    camera.position.y = eye.current;
    camera.rotation.set(look.current.pitch, look.current.yaw, 0, 'YXZ');
  });

  if (!(mapControls && mode === 'map')) return null;
  if (mapStyle === 'plate')
    return <MapControls key="plate" ref={controls} target={mapTarget} enableRotate={false} minDistance={140} maxDistance={720} screenSpacePanning={false} />;
  return (
    <MapControls
      key="atlas"
      ref={controls}
      target={mapTarget}
      enableDamping
      dampingFactor={0.08}
      minDistance={80}
      maxDistance={520}
      minPolarAngle={0.6}
      maxPolarAngle={1.2}
      minAzimuthAngle={-Math.PI / 2 - 0.85}
      maxAzimuthAngle={-Math.PI / 2 + 0.85}
      screenSpacePanning={false}
      onChange={() => {
        const t = controls.current?.target;
        if (!t) return;
        const cx = THREE.MathUtils.clamp(t.x, PAN.x0, PAN.x1), cz = THREE.MathUtils.clamp(t.z, PAN.z0, PAN.z1);
        if (cx !== t.x || cz !== t.z) {
          camera.position.x += cx - t.x; camera.position.z += cz - t.z;
          t.x = cx; t.z = cz;
        }
      }}
    />
  );
}
