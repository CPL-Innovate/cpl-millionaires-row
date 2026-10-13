import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { BEATS, BUILDINGS, STATIONS, plateToWorld, type Station } from '../data/site';
import { makePhotoMaterial } from '../gl/materials';

// The CPL photograph, held up at the station's (approximate) camera position.
export function PhotoGhost({ station, opacity }: { station: Station; opacity: number }) {
  const photo = station.photo!;
  const tex = useLoader(THREE.TextureLoader, photo.url);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = useMemo(() => makePhotoMaterial(tex), [tex]);
  const { camera } = useThree();
  useEffect(() => {
    mat.uniforms.uOpacity.value = opacity;
  }, [mat, opacity]);

  const { pos, quat, w, h } = useMemo(() => {
    const from = new THREE.Vector3(...station.position);
    const dir = new THREE.Vector3(...station.target).sub(from).normalize();
    const D = 6;
    const pos = from.clone().addScaledVector(dir, D);
    // plane faces +z: aim its z axis back at the viewer
    const m = new THREE.Matrix4().lookAt(from, pos, new THREE.Vector3(0, 1, 0));
    const quat = new THREE.Quaternion().setFromRotationMatrix(m);
    const fov = ((camera as THREE.PerspectiveCamera).fov * Math.PI) / 180;
    const h = 2 * D * Math.tan(fov / 2) * 0.78;
    return { pos, quat, w: h * photo.aspect, h };
  }, [station, camera, photo.aspect]);

  return (
    <mesh position={pos} quaternion={quat} material={mat} renderOrder={10}>
      <planeGeometry args={[w, h]} />
    </mesh>
  );
}

// Both overlays stay mounted and hide when not in use: each drei <Html> owns a React root, and
// unmounting them on a mode switch (or from inside their own click) tore those roots down mid-render.
export function BeatPins({ onPick, active, show }: { onPick: (id: string) => void; active: string | null; show: boolean }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  // only nearby beats show, so pins don't pile up through buildings from across the block
  useFrame(({ camera }) => {
    BEATS.forEach((b, i) => {
      const el = refs.current[i];
      if (!el) return;
      const near = show && camera.position.distanceTo(tmp.set(...b.position)) < (b.id === 'windmill' || b.id === 'bells' ? 200 : 90);
      el.style.opacity = near ? '1' : '0';
      el.style.pointerEvents = near ? 'auto' : 'none';
    });
  });
  return (
    <>
      {BEATS.map((b, i) => (
        <Html key={b.id} position={b.position} center zIndexRange={[20, 0]}>
          <button
            ref={(el) => { refs.current[i] = el; }}
            className={`pin ${active === b.id ? 'on' : ''}`}
            style={{ opacity: 0, pointerEvents: 'none' }} // start hidden; the frame loop shows nearby pins
            onClick={() => onPick(b.id)}
            title={b.title}
          >
            <span>{i + 1}</span>
          </button>
        </Html>
      ))}
    </>
  );
}

export function PlateLabels({ onPick, show }: { onPick: (stationId: string) => void; show: boolean }) {
  const stationFor = (id: string) => (STATIONS.find((s) => s.id === id || id.startsWith(s.id)) ?? STATIONS[0]).id;
  return (
    <>
      {BUILDINGS.map((b) => {
        const [x, z] = plateToWorld(b.plate[0], b.plate[1]);
        // north-side lots are narrow: alternate labels above / below the house so they don't stack
        const north = BUILDINGS.filter((o) => o.plate[1] < 700).sort((a, c) => a.plate[0] - c.plate[0]);
        const i = north.indexOf(b);
        const dy = i < 0 ? 0 : i % 2 === 0 ? -34 : 30;
        return (
          <Html key={b.id} position={[x, 0, z]} center zIndexRange={[20, 0]}>
            <button
              className="lot"
              style={{ transform: `translateY(${dy}px)`, visibility: show ? 'visible' : 'hidden' }}
              tabIndex={show ? 0 : -1}
              onClick={() => onPick(stationFor(b.id))}
            >
              <b>{b.short}</b>
              <i>1881 plate: {b.plateLabel}</i>
            </button>
          </Html>
        );
      })}
    </>
  );
}
