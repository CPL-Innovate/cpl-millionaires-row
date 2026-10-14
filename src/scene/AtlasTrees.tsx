import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { makeAtlasShadowMaterial, makeAtlasTreeMaterial } from '../gl/materials';

// The Atlas's trees: one watercolour shape and one ground shadow per tree, instanced. `data` comes
// from the street kit: per tree [crown x, z, bottom, top, radius, seed, autumn].
export function AtlasTrees({ data }: { data: number[] }) {
  const { trees, shadows } = useMemo(() => {
    const n = data.length / 7;
    const crown = new Float32Array(n * 4), shape = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      crown.set([data[i * 7], data[i * 7 + 1], data[i * 7 + 2], data[i * 7 + 3]], i * 4);
      shape.set([data[i * 7 + 4], data[i * 7 + 5], data[i * 7 + 6]], i * 3);
    }
    const make = (pos: number[]) => {
      const g = new THREE.InstancedBufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex([0, 1, 2, 0, 2, 3]);
      g.setAttribute('iCrown', new THREE.InstancedBufferAttribute(crown, 4));
      g.setAttribute('iShape', new THREE.InstancedBufferAttribute(shape, 3));
      g.instanceCount = n;
      g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
      return g;
    };
    // tree quad: x −1…1 across, y 0…1 up from the foot; shadow quad: −1…1 both ways
    return { trees: make([-1, 0, 0, 1, 0, 0, 1, 1, 0, -1, 1, 0]), shadows: make([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]) };
  }, [data]);
  useEffect(() => () => { trees.dispose(); shadows.dispose(); }, [trees, shadows]);
  const treeMat = useMemo(() => makeAtlasTreeMaterial(), []);
  const shadowMat = useMemo(() => makeAtlasShadowMaterial(), []);
  return (
    <>
      <mesh geometry={shadows} material={shadowMat} renderOrder={1} frustumCulled={false} />
      <mesh geometry={trees} material={treeMat} renderOrder={2} frustumCulled={false} />
    </>
  );
}
