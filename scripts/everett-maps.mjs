// Pull the colour and normal maps out of the un-decimated Tripo export and write 2k JPEGs for the
// Everett "Watercolour" and "Texture" looks. The shipped mesh keeps the same UV atlas.
// Usage: node scripts/everett-maps.mjs <everett_tripo_a1-oneshot_decim300k.glb>   (macOS: uses sips)
// Reads the GLB container directly, so the Draco-compressed geometry doesn't need a decoder.
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const glb = readFileSync(process.argv[2]);
const jsonLen = glb.readUInt32LE(12);
const json = JSON.parse(glb.subarray(20, 20 + jsonLen).toString());
const bin = glb.subarray(20 + jsonLen + 8);
const mat = json.materials[0];
const slots = { basecolor: mat.pbrMetallicRoughness.baseColorTexture.index, normal: mat.normalTexture.index };
const tmp = mkdtempSync(join(tmpdir(), 'everett-'));
for (const [name, tex] of Object.entries(slots)) {
  const img = json.images[json.textures[tex].source];
  const view = json.bufferViews[img.bufferView];
  const raw = join(tmp, `${name}.${img.mimeType.split('/')[1]}`);
  writeFileSync(raw, bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength));
  execFileSync('sips', ['-Z', '2048', raw, '--out', `public/models/everett-${name}.jpg`, '-s', 'format', 'jpeg', '-s', 'formatOptions', '88']);
  console.log(`public/models/everett-${name}.jpg`);
}
