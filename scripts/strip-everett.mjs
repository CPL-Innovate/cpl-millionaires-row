// Keep only the base-colour texture on the Everett spike mesh (pencil shading uses geometry, not PBR maps).
import { NodeIO } from '@gltf-transform/core';
import { prune } from '@gltf-transform/functions';
const [src, dst] = process.argv.slice(2);
const io = new NodeIO();
const doc = await io.read(src);
for (const m of doc.getRoot().listMaterials()) {
  m.setNormalTexture(null);
  m.setMetallicRoughnessTexture(null);
}
await doc.transform(prune());
await io.write(dst, doc);
