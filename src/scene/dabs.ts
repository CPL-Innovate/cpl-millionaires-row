import * as THREE from 'three';

// dab buffers are flat arrays of [x, y, z, size(m), tint(0–4 along the wash ramp), seed]
export function dabGeo(arr: number[]) {
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

export function rand(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
