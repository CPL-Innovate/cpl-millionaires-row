// Slim a raw Tripo export for the demo: keep only the base-colour map (the pencil shading uses
// geometry, not PBR maps), decimate to ~85k triangles, shrink the map to 1024², and meshopt-compress.
// Meshopt quantises positions and puts a dequantising scale/offset on the node; the scene bakes that
// node transform back into the geometry (see MeshHouse in src/scene/World.tsx).
// Usage: node scripts/slim-model.mjs <raw.glb> <public/models/out.glb> [targetTriangles=85000]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { dedup, meshopt, prune, simplify, textureCompress, weld } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const [src, dst, target = '85000'] = process.argv.slice(2);
await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(src);

for (const m of doc.getRoot().listMaterials()) {
  m.setNormalTexture(null);
  m.setMetallicRoughnessTexture(null);
}
for (const e of doc.getRoot().listExtensionsUsed()) if (e.extensionName !== EXTMeshoptCompression.EXTENSION_NAME) e.dispose();

const tris = () => doc.getRoot().listMeshes().flatMap((m) => m.listPrimitives()).reduce((n, p) => n + (p.getIndices()?.getCount() ?? 0) / 3, 0);
const before = tris();
await doc.transform(
  prune(),
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio: Math.min(1, +target / before), error: 0.01 }),
  textureCompress({ encoder: sharp, targetFormat: 'jpeg', resize: [1024, 1024], quality: 85 }),
  dedup(),
  prune(),
);
const after = tris();
await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
await io.write(dst, doc);
console.log(`${dst}: ${Math.round(before).toLocaleString()} → ${Math.round(after).toLocaleString()} triangles`);
