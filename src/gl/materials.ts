import * as THREE from 'three';
import { U } from './uniforms';
import { WASH_PARAMS, WASH_DEFAULTS } from '../settings/schema';

// per-house watercolour uniforms (uW_<key>); update them with setWash()
const WASH_UNIFORMS = WASH_PARAMS.map((p) => `uniform float uW_${p.key};`).join('\n');
export function setWash(mat: THREE.ShaderMaterial, values: Record<string, number>) {
  for (const p of WASH_PARAMS) if (mat.uniforms[`uW_${p.key}`]) mat.uniforms[`uW_${p.key}`].value = values[p.key] ?? p.def;
}
import { EUCLID, CASE, type MeshProvenance, type Provenance } from '../data/site';

const STATE: Record<Provenance, number> = { photographed: 0, inferred: 1, invented: 2 };

// Per-face provenance of an image-to-3D mesh as uniforms (see MeshProvenance in data/site.ts).
// `box` is the model's object-space bounds: lines have no normals, so they use position zones.
function provUniforms(p: MeshProvenance, box: THREE.Box3) {
  return {
    uProv: { value: new THREE.Vector4(STATE[p.front], STATE[p.sideNegX], STATE[p.sidePosX], STATE[p.roof]) },
    uProvRear: { value: STATE[p.rear] },
    uFrontInvX: { value: p.frontInventedPastX ?? 1e3 },
    uBehindZ: { value: p.inventedBehindZ ?? -1e3 },
    uBoxMin: { value: box.min.clone() },
    uBoxMax: { value: box.max.clone() },
  };
}

// shared GLSL for both surfaces and lines
const PROV = /* glsl */ `
uniform vec4 uProv;      // front, side −x, side +x, roof
uniform float uProvRear;
uniform float uFrontInvX;
uniform float uBehindZ;
uniform vec3 uBoxMin, uBoxMax;
`;

// ---------------------------------------------------------------------------------------------
// Shared GLSL. The reveal is the Chartogne technique: a noise texture plus a per-cell random
// offset, thresholded hard, so progress reads as sketchy blotches rather than a fade. Here it is
// radial — the street draws itself outward from a point.
// ---------------------------------------------------------------------------------------------
const COMMON = /* glsl */ `
uniform float uTime;
uniform sampler2D uNoise;
uniform vec3 uPaper;
uniform vec3 uPencil;
uniform vec3 uInk;
uniform vec3 uFaint;
uniform float uEvidence;
uniform float uStreet;
uniform float uAtlas;
uniform vec2 uRevealCenter;
uniform float uRevealRadius;

float noise2(vec2 p) { return texture2D(uNoise, p).r; }
float hash2(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

// 1 where revealed, 0 where not yet drawn
float reveal(vec2 xz) {
  float d = distance(xz, uRevealCenter);
  float n = noise2(xz * 0.012) * 26.0 + hash2(floor(xz * 0.35)) * 6.0;
  return step(d + n, uRevealRadius);
}

// on screen at all: painted in by the street reveal, or drawn in the Atlas (which blotches in
// and out with the same kind of noise as uAtlas runs 0 → 1)
float atlasIn(vec2 xz) { return step(noise2(xz * 0.009) * 0.8 + 0.1, uAtlas); }
float shown(vec2 xz) { return max(reveal(xz), atlasIn(xz)); }

// triangle wave in [0,1]
float tri(float x) { return abs(fract(x) - 0.5) * 2.0; }

// Coverage of hatch lines for darkness d in [0,1]. Lines come from distance to a far point
// (parallel, slightly curved strokes in world space), wobbled by noise like a hand.
float hatch(vec3 wp, vec3 farPoint, float freq, float d, float wobble) {
  float s = distance(wp, farPoint) * freq;
  s += (noise2(wp.xz * 0.05 + wp.y * 0.03) - 0.5) * wobble;
  float t = tri(s);
  float w = fwidth(s) * 1.5;
  return 1.0 - smoothstep(d - w, d + w, t);
}

float paperGrain(vec2 fragCoord) {
  return texture2D(uNoise, fragCoord / 256.0).g;
}
`;

// ---------------------------------------------------------------------------------------------
// Surfaces: massing blocks and the image-to-3D meshes. Provenance state is a uniform (0
// photographed, 1 inferred, 2 invented) or, for a mesh, derived per fragment from its
// object-space normal and position (MeshProvenance).
// ---------------------------------------------------------------------------------------------
// With `looks` (the Everett mesh), the same surface can also render as a watercolour wash over
// the model's texture or as the texture itself, lit; uLookFrom → uLookTo blotches across as
// uLookT runs 0 → 1, with the same noise family as the street reveal.
export function makeSurfaceMaterial(opts: {
  state?: number;
  mesh?: { provenance: MeshProvenance; box: THREE.Box3 };
  map?: THREE.Texture | null;
  looks?: { map: THREE.Texture; normalMap: THREE.Texture; wash?: Record<string, number> };
}) {
  return new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    defines: { MESH: opts.mesh ? 1 : 0, USE_PHOTOMAP: opts.map ? 1 : 0, LOOKS: opts.looks ? 1 : 0 },
    uniforms: {
      ...U,
      ...(opts.mesh ? provUniforms(opts.mesh.provenance, opts.mesh.box) : {}),
      uState: { value: opts.state ?? 1 },
      uMap: { value: opts.map ?? null },
      uLookMap: { value: opts.looks?.map ?? null },
      uNormalMap: { value: opts.looks?.normalMap ?? null },
      uNormalScale: { value: new THREE.Vector2(1, 1) },
      ...Object.fromEntries(WASH_PARAMS.map((p) => [`uW_${p.key}`, { value: opts.looks?.wash?.[p.key] ?? WASH_DEFAULTS[p.key] }])),
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying vec3 vNormalO;
      varying vec3 vPosO;
      varying float vDepth;
      varying vec2 vUv;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vNormalO = normal;
        vPosO = position;
        vUv = uv;
        vec4 mv = viewMatrix * wp;
        vDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      uniform vec3 uLightDir;
      uniform float uState;
      uniform sampler2D uMap;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying vec3 vNormalO;
      varying vec3 vPosO;
      varying float vDepth;
      varying vec2 vUv;
      #if MESH
      ${PROV}
      #endif

      #if LOOKS
      uniform sampler2D uLookMap;
      uniform sampler2D uNormalMap;
      uniform vec2 uNormalScale;
      ${WASH_UNIFORMS}
      uniform vec3 uFoliage[8];
      uniform vec3 uEarth[6];
      uniform float uLookFrom, uLookTo, uLookT;
      const vec3 LUMA = vec3(0.299, 0.587, 0.114);

      vec3 rampE(float t) { t = clamp(t, 0.0, 4.999); int i = int(floor(t)); return mix(uEarth[i], uEarth[i + 1], fract(t)); }

      // tangent-free normal mapping from screen-space derivatives (the Tripo atlas has thousands
      // of small UV islands, so per-pixel frames are safer than baked tangents anyway)
      vec3 perturb(vec3 N, float strength) {
        vec3 q0 = dFdx(vWorld), q1 = dFdy(vWorld);
        vec2 st0 = dFdx(vUv), st1 = dFdy(vUv);
        vec3 q1perp = cross(q1, N), q0perp = cross(N, q0);
        vec3 T = q1perp * st0.x + q0perp * st1.x;
        vec3 B = q1perp * st0.y + q0perp * st1.y;
        float det = max(dot(T, T), dot(B, B));
        float sc = det == 0.0 ? 0.0 : inversesqrt(det);
        vec3 m = texture2D(uNormalMap, vUv).xyz * 2.0 - 1.0;
        m.xy *= uNormalScale * strength;
        return normalize(T * (m.x * sc) + B * (m.y * sc) + N * m.z);
      }

      // the texture as it came from the model, under the scene's soft south-west light
      vec3 textureLook(vec3 n) {
        vec3 alb = texture2D(uLookMap, vUv).rgb;
        vec3 nn = perturb(n, 1.0);
        float sun = clamp(dot(nn, uLightDir), 0.0, 1.0);
        vec3 amb = mix(uEarth[2], uPaper, 0.5 + 0.5 * nn.y);   // warm bounce below, paper sky above
        vec3 c = alb * (amb * 0.7 + vec3(1.0, 0.95, 0.86) * sun * 0.7);
        c *= 1.0 - clamp(1.0 - vWorld.y / 2.5, 0.0, 1.0) * 0.3; // contact shadow at the foot of the walls
        return c;
      }

      // a watercolour of the texture: its values and detail, the palette's earths, washes laid in
      // three passes with wobbling wet edges, the paper left white where the light hits hardest
      vec3 washLook(vec3 n) {
        // (every uW_ value is a per-house Generator setting; see WASH_PARAMS)
        vec3 alb = texture2D(uLookMap, vUv, uW_softness).rgb;
        float al = dot(alb, LUMA);
        // the texture's own colour, nudged toward the palette's earths and kept clean (no mud)
        vec3 pig = mix(alb, rampE(1.0 + al * 5.0) * (0.6 + al), uW_paletteTint);
        pig = max(mix(vec3(dot(pig, LUMA)), pig, uW_saturation), 0.0);
        // roofs: cool slate-coloured texture (not the darker glass) above a height. The jagged Tripo
        // meshes make the surface angle useless here. Pulled toward slate on request, keeping the
        // texture's own light and dark.
        float hgt = (vPosO.y - uBoxMin.y) / max(uBoxMax.y - uBoxMin.y, 1e-4);
        float roof = smoothstep(-0.07, 0.0, alb.b - alb.r) * smoothstep(0.1, 0.2, al) * smoothstep(uW_roofFrom - 0.04, uW_roofFrom + 0.04, hgt);
        vec3 slate = mix(vec3(0.16, 0.19, 0.28), uFoliage[7] * 0.8, uW_roofViolet) * (0.55 + al);
        pig = mix(pig, slate, uW_roofSlate * roof);

        vec3 nn = perturb(n, uW_relief);
        vec2 wq = vec2(vWorld.x + vWorld.z, vWorld.y);
        float wob = noise2(wq * 0.045) - 0.5;
        float s = clamp(dot(nn, uLightDir), 0.0, 1.0) * 0.75 + 0.25 * (0.5 + 0.5 * nn.y) + wob * uW_wobble;
        float lit = smoothstep(0.56, 0.6, s);
        float mid = smoothstep(0.3, 0.34, s);
        float D = uW_pigment + uW_shadowDepth * (0.59 * (1.0 - mid) + 0.41 * (1.0 - lit));
        // wet edges: pigment pools where one wash stops
        D += (1.0 - smoothstep(0.0, 0.035, abs(s - 0.32))) * uW_wetEdges + (1.0 - smoothstep(0.0, 0.035, abs(s - 0.58))) * uW_wetEdges * 0.67;
        // granulation and uneven pigment load
        D *= 1.0 - uW_granulation * 0.6 + uW_granulation * noise2(wq * 0.31 + 0.17) + 0.1 * paperGrain(gl_FragCoord.xy);
        // reserved whites: bare paper on the brightest sunlit patches
        float reserve = lit * step(0.62, noise2(wq * 0.09 + 0.5) + (s - 0.6) * 0.8);
        D += uW_roofPaint * roof;
        D *= 1.0 - reserve * uW_reserve * mix(1.0, uW_roofWhites, roof);
        // lost edges: the foot of the wall bleeds into the lawn (the contact dots cover the seam)
        if (uW_bleed > 0.001) D *= smoothstep(0.0, 1.0, (vWorld.y - 0.05) / max(uW_bleed + wob * uW_bleed * 1.1, 0.01));

        vec3 shade = mix(pig, uFoliage[7] * 0.8, uW_violet * (1.0 - mid));               // violet in the shadows
        shade = mix(shade, shade * vec3(1.0 + uW_warmth, 1.0, 1.0 - uW_warmth * 1.67), lit * (1.0 - uW_roofSlate * roof)); // warm where the sun lands (not on slate)
        vec3 c = mix(uPaper, shade, clamp(D, 0.0, 1.0));
        c = uW_lightness >= 0.0 ? mix(c, uPaper, uW_lightness) : c * (1.0 + uW_lightness);
        // keep the pencil in the shadows only, and only where there is paint
        float h = hatch(vWorld, vec3(900.0, 1400.0, 300.0), 4.6, (1.0 - mid) * 0.32, 0.6);
        c = mix(c, uPencil, h * uW_pencil * smoothstep(0.15, 0.5, D) * (1.0 - smoothstep(70.0, 180.0, vDepth)));
        return c;
      }
      #endif

      void main() {
        if (shown(vWorld.xz) < 0.5) discard;

        vec3 n = normalize(vNormalW);
        if (!gl_FrontFacing) n = -n;

        float state = uState;
        #if MESH
          vec3 no = normalize(vNormalO);
          if (no.y > 0.6) state = uProv.w;                                    // roof
          else if (no.z > 0.35) state = vPosO.x > uFrontInvX ? 2.0 : uProv.x; // front
          else if (no.x < -0.35) state = uProv.y;                             // left side
          else if (no.x > 0.35) state = uProv.z;                              // right side
          else state = uProvRear;                                             // rear
          if (vPosO.z < uBehindZ) state = 2.0;                                // past where the evidence stops
        #endif

        // soft overcast light + a little sky occlusion near the ground
        float lambert = clamp(dot(n, uLightDir), 0.0, 1.0);
        float d = 0.82 * (1.0 - (0.38 + 0.62 * lambert));
        d += clamp(1.0 - vWorld.y / 5.0, 0.0, 1.0) * 0.08;
        d = clamp(d, 0.0, 1.0);

        vec3 farA = vec3(900.0, 1400.0, 300.0);
        vec3 farB = vec3(-700.0, 1200.0, 900.0);
        float freq = 4.2;

        float photographed = 1.0 - step(0.5, state);
        float invented = step(1.5, state);
        float inferred = 1.0 - photographed - invented;

        #if USE_PHOTOMAP
          // the photo-derived texture drives tone on photographed faces: ink, cross-hatched
          float lum = dot(texture2D(uMap, vUv).rgb, vec3(0.299, 0.587, 0.114));
          d = mix(d, clamp(1.05 - lum * 1.25, 0.0, 0.85), photographed * 0.6);
        #endif

        // evidence mode: inferred lightens, invented recedes to construction lines
        d *= mix(1.0, 0.55, uEvidence * inferred);
        d *= mix(1.0, 0.0, uEvidence * invented);

        float far = smoothstep(70.0, 180.0, vDepth);
        float h1 = hatch(vWorld, farA, freq * (1.0 + photographed * 0.6), d * 0.9, 0.6);
        float h2 = hatch(vWorld, farB, freq * 1.1 * (1.0 + photographed * 0.6), d - 0.35, 0.6);
        float lines = max(h1, h2 * (0.6 + photographed * 0.4));
        lines = mix(lines, d * 0.7, far); // far away, strokes merge into tone

        vec3 stroke = mix(uPencil, uInk, photographed);
        stroke = mix(stroke, uFaint, invented * (0.35 + 0.65 * uEvidence));

        vec3 col = mix(uPaper, stroke, lines * 0.78);
        col *= 0.97 + paperGrain(gl_FragCoord.xy) * 0.05;

        // atmospheric fade back to paper
        float fog = smoothstep(140.0, 420.0, vDepth);
        col = mix(col, uPaper, fog);

        float alpha = mix(1.0, 0.07, uEvidence * invented);

        #if LOOKS
        {
          vec3 pencilCol = col;
          vec3 cols[3];
          cols[0] = pencilCol;
          cols[1] = washLook(n);
          cols[2] = textureLook(n);
          for (int i = 1; i < 3; i++) {
            // colour is inferred everywhere (every source is B&W): evidence mode drains it, and
            // invented faces fall back toward construction lines
            vec3 c = cols[i];
            c = mix(c, vec3(dot(c, LUMA)), uEvidence * 0.85);
            c = mix(c, mix(uPaper, uFaint, 0.25), invented * uEvidence * 0.6);
            c *= 0.97 + paperGrain(gl_FragCoord.xy) * 0.05;
            cols[i] = mix(c, uPaper, fog);
          }
          vec3 from = cols[int(uLookFrom + 0.5)];
          vec3 to = cols[int(uLookTo + 0.5)];
          vec2 bq = vec2(vWorld.x + vWorld.z, vWorld.y);
          float k = noise2(bq * 0.03) * 0.8 + hash2(floor(bq * 0.6)) * 0.2;
          float t = uLookT * 1.1;
          col = mix(from, to, step(k, t));
          col = mix(col, uPencil, (1.0 - smoothstep(0.0, 0.025, abs(k - t))) * step(0.001, uLookT) * step(uLookT, 0.999) * 0.5);
        }
        #endif

        gl_FragColor = vec4(col, alpha);
        #include <colorspace_fragment>
      }
    `,
  });
}

// ---------------------------------------------------------------------------------------------
// Lines: building edges, trees, fences, the windmill. Hand wobble in the vertex shader; dashed
// for invented; faded by distance.
// ---------------------------------------------------------------------------------------------
export function makeLineMaterial(opts: { state?: number; mesh?: { provenance: MeshProvenance; box: THREE.Box3 }; looks?: boolean; weight?: number }) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    defines: { MESH: opts.mesh ? 1 : 0, LOOKS: opts.looks ? 1 : 0 },
    uniforms: {
      ...U,
      ...(opts.mesh ? provUniforms(opts.mesh.provenance, opts.mesh.box) : {}),
      uState: { value: opts.state ?? 1 },
      uWeight: { value: opts.weight ?? 1 },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform sampler2D uNoise;
      attribute float lineDistance;
      varying vec3 vWorld;
      varying vec3 vPosO;
      varying float vDepth;
      varying float vDist;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        // slight hand wobble
        vec2 q = wp.xz * 0.21 + wp.y * 0.17;
        wp.xyz += (vec3(texture2D(uNoise, q).r, texture2D(uNoise, q + 0.37).r, texture2D(uNoise, q + 0.71).r) - 0.5) * 0.09;
        vWorld = wp.xyz;
        vPosO = position;
        vDist = lineDistance;
        vec4 mv = viewMatrix * wp;
        vDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      uniform float uState;
      uniform float uWeight;
      uniform float uLookLines;
      varying vec3 vWorld;
      varying vec3 vPosO;
      varying float vDepth;
      varying float vDist;
      #if MESH
      ${PROV}
      #endif
      void main() {
        if (shown(vWorld.xz) < 0.5) discard;
        float state = uState;
        #if MESH
        {
          // lines carry no normal: sort them by zone of the bounding box, matching the surface rule
          vec3 q = (vPosO - (uBoxMin + uBoxMax) * 0.5) / max((uBoxMax - uBoxMin) * 0.5, vec3(1e-4));
          state = uProvRear;
          if (q.x < -0.6) state = uProv.y;
          if (q.x > 0.6) state = uProv.z;
          if (q.z > 0.4) state = vPosO.x > uFrontInvX ? 2.0 : uProv.x;
          if (state > 1.5 && q.y > 0.45) state = uProv.w; // up in the roof, unevidenced lines are roof
          if (vPosO.z < uBehindZ) state = 2.0;
        }
        #endif
        float photographed = 1.0 - step(0.5, state);
        float invented = step(1.5, state);

        vec3 col = mix(uPencil, uInk, photographed);
        float a = 0.85 * uWeight;
        if (invented > 0.5) {
          col = mix(col, uFaint, 0.3 + 0.7 * uEvidence);
          // construction dashes appear as evidence mode strengthens
          float dash = step(0.45, fract(vDist * 1.4));
          a *= mix(1.0, dash * 0.75, uEvidence);
        }
        a *= 1.0 - smoothstep(120.0, 380.0, vDepth);
        #if LOOKS
          a *= uLookLines;
        #endif
        gl_FragColor = vec4(col, a);
        #include <colorspace_fragment>
      }
    `,
  });
}

// ---------------------------------------------------------------------------------------------
// Ground: the 1881 plate. In map mode it is the plate (duotoned toward the palette). In street
// mode the plate's linework survives faintly underfoot, and the roads are hatched in.
// ---------------------------------------------------------------------------------------------
export function makeGroundMaterial(plate: THREE.Texture) {
  return new THREE.ShaderMaterial({
    depthWrite: false,
    uniforms: {
      ...U,
      uPlate: { value: plate },
      uEuclid: { value: new THREE.Vector2(EUCLID.roadHalf, EUCLID.rowHalf) },
      uCase: { value: new THREE.Vector2(CASE.roadHalf, CASE.rowHalf) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWorld;
      varying float vDepth;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        vec4 mv = viewMatrix * wp;
        vDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      uniform sampler2D uPlate;
      uniform float uPlateColor;
      uniform vec3 uFoliage[7];
      uniform vec3 uEarth[6];
      uniform vec2 uEuclid;
      uniform vec2 uCase;
      uniform sampler2D uLots;
      uniform float uLotHover, uLotHoverT, uLotSel;
      uniform vec3 uMark;
      varying vec2 vUv;
      varying vec3 vWorld;
      varying float vDepth;

      // lot ids are stored as (index + 1) × 20 in the red channel; antialiased edge pixels fall
      // between steps and belong to no lot
      float isLot(vec2 uv, float idx) {
        if (idx < 0.0) return 0.0;
        return step(abs(texture2D(uLots, uv).r * 255.0 - (idx + 1.0) * 20.0), 4.0);
      }

      float band(float d, float halfW, float aa) { return 1.0 - smoothstep(halfW - aa, halfW + aa, abs(d)); }

      vec3 rampF(float t) { t = clamp(t, 0.0, 4.999); int i = int(floor(t)); return mix(uFoliage[i], uFoliage[i + 1], fract(t)); }
      vec3 rampE(float t) { t = clamp(t, 0.0, 4.999); int i = int(floor(t)); return mix(uEarth[i], uEarth[i + 1], fract(t)); }

      void main() {
        vec3 plate = texture2D(uPlate, vUv).rgb;
        float lum = dot(plate, vec3(0.299, 0.587, 0.114));
        // duotone toward the palette; keep some of the plate's own pinks in warm palettes
        float t = smoothstep(0.08, 0.62, lum);
        vec3 duo = mix(uPencil, uPaper, t);
        vec3 mapCol = mix(duo, plate * (uPaper / max(vec3(0.87, 0.67, 0.46), vec3(0.01))), uPlateColor);
        // linework only (dark ink of the plate) for the street treatment
        float ink = 1.0 - smoothstep(0.18, 0.42, lum);

        // street geometry
        float x = vWorld.x;
        float z = vWorld.z;
        float de = z; // Euclid centreline is z = 0 in the georeferenced frame
        float dc = x;
        float road = max(band(de, uEuclid.x, 0.2), band(dc, uCase.x, 0.2));
        float row = max(band(de, uEuclid.y, 0.2), band(dc, uCase.y, 0.2));
        float onCase = step(abs(dc), uCase.x) * (1.0 - step(abs(de), uEuclid.x));
        float across = abs(mix(de, dc, onCase));
        float rut = (exp(-pow((across - 2.4) / 0.55, 2.0)) + exp(-pow((across - 6.3) / 0.55, 2.0))) * road;
        float kind = road > 0.5 ? 1.0 : (row > 0.5 ? 2.0 : 0.0);

        // under the dot carpet: a pale underpainting so gaps read as cream paper, not holes
        vec2 xz = vWorld.xz;
        vec3 avg = kind < 0.5 ? rampF(3.2) : (kind < 1.5 ? rampE(3.2 - rut) : rampE(4.2));
        vec3 streetCol = mix(uPaper, avg, 0.3 + 0.1 * noise2(xz * 0.03));
        streetCol = mix(streetCol, uPaper, smoothstep(160.0, 520.0, vDepth));

        // Atlas: the plate redrawn as an engraving. Its linework in ink on bare paper, lawns in
        // light strokes running back from the street (like the lot lines), the right-of-way in
        // stipple, everything thinning into the paper with distance.
        vec3 atlasCol;
        {
          float grain = noise2(xz * 0.21) * 0.6 + noise2(xz * 1.3) * 0.4;
          vec3 paperC = uPaper * (0.975 + 0.04 * grain);
          float lineInk = (1.0 - smoothstep(0.22, 0.5, lum)) * 0.85;
          float foot = smoothstep(0.03, 0.12, plate.r - plate.b) * (1.0 - smoothstep(0.22, 0.5, lum)) ; // pink footprints
          float strokes = 0.0;
          if (kind < 0.5) {
            float along = xz.x + noise2(xz * 0.02) * 6.0;
            float st = tri(along * 0.9);
            float broken = smoothstep(0.35, 0.65, noise2(vec2(along * 0.05, xz.y * 0.06)));
            strokes = smoothstep(0.82, 0.97, st) * broken * 0.3;
          } else if (kind > 1.5) {
            strokes = step(0.86, hash2(floor(xz * 2.4))) * 0.35;
          }
          float ink = clamp(max(lineInk, strokes) - foot * 0.5, 0.0, 1.0);
          atlasCol = mix(paperC, uPencil, ink * 0.75);
          // lots: the hovered one hatched in the accent with a firm edge; the selected one stays
          vec2 px = vec2(1.6) / vec2(1000.0, 700.0);
          float hov = isLot(vUv, uLotHover) * uLotHoverT;
          float sel = isLot(vUv, uLotSel);
          float on = max(hov, sel);
          if (on > 0.0) {
            float id = hov > 0.0 ? uLotHover : uLotSel;
            float inner = isLot(vUv + vec2(px.x, 0.0), id) * isLot(vUv - vec2(px.x, 0.0), id) * isLot(vUv + vec2(0.0, px.y), id) * isLot(vUv - vec2(0.0, px.y), id);
            float wob = noise2(xz * 0.05) * 1.6;
            float h = smoothstep(0.55, 0.85, tri((xz.x * 0.7 + xz.y * 0.7) * 0.85 + wob));
            vec3 red = mix(atlasCol, uMark, 0.12);
            red = mix(red, uMark * (0.85 + 0.2 * grain), h * 0.75 + ink * 0.6);
            red = mix(red, uMark * 0.8, 1.0 - inner);
            atlasCol = mix(atlasCol, red, on);
          }
          vec2 rim = min(vUv, 1.0 - vUv);
          float sheetEdge = smoothstep(0.0, 0.08, min(rim.x, rim.y * 1.4)); // the plate dissolves into the page
          atlasCol = mix(uPaper, atlasCol, sheetEdge * (1.0 - smoothstep(380.0, 900.0, vDepth)));
        }
        mapCol = mix(mapCol, atlasCol, uAtlas);

        // street treatment sketches in over the plate with the shared reveal
        float s = uStreet * reveal(vWorld.xz);
        vec3 col = mix(mapCol, streetCol, s);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
}

// ---------------------------------------------------------------------------------------------
// Ghost photograph: the CPL photo inks in over the drawing with the noise reveal (the same
// shader family Chartogne uses for its labels).
// ---------------------------------------------------------------------------------------------
export function makePhotoMaterial(tex: THREE.Texture) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: { ...U, uPhoto: { value: tex }, uOpacity: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      uniform sampler2D uPhoto;
      uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        // distance from the centre of the print: 0 at the middle, 1 at the edge (a softened square)
        vec2 q = abs(vUv - 0.5) * 2.0;
        float r = mix(max(q.x, q.y), length(q) * 0.7071, 0.35);
        float n = noise2(vUv * vec2(1.4, 1.1) + 0.3) * 0.6 + noise2(vUv * 7.0 + 0.7) * 0.4;
        // the print develops from the middle outward with a ragged, wet front
        float front = uOpacity * 1.55;
        float rr = r + (n - 0.5) * 0.4;
        float shown = 1.0 - smoothstep(front - 0.1, front, rr);
        // and keeps a soft deckled edge: no hard rectangle against the drawing
        float edge = 1.0 - smoothstep(0.84, 1.0, r + (n - 0.5) * 0.22);
        vec3 c = texture2D(uPhoto, vUv).rgb;
        // pigment pools a little at the developing front
        c *= 1.0 - 0.18 * (1.0 - smoothstep(0.0, 0.07, abs(rr - front + 0.05))) * step(uOpacity, 0.98);
        float a = shown * edge;
        gl_FragColor = vec4(c, a);
        #include <colorspace_fragment>
      }
    `,
  });
}

// ---------------------------------------------------------------------------------------------
// Watercolour dabs for the environment (tree crowns, lawns, leaf litter, shrubs, falling leaves).
// Chartogne's technique — thousands of discs sized by 1/depth with per-point randomness — but
// each disc is painted as a wash: irregular rim, pigment pooling at the edge, paper granulation.
// The environment is the least-evidenced layer, so it is the loosest; Evidence mode thins it out.
// ---------------------------------------------------------------------------------------------
// solid: opaque, depth-writing discs that stack like paint (Chartogne's crowns), coloured from the
// foliage ramp by aTint (0–5 shadow→light, 6 pink, 7 lavender, 10–15 earth ramp)
// carpet: a box of points that wraps around the camera (Chartogne's floating-particle trick), each
// point placed on the ground and coloured procedurally from where it lands — lawn, sidewalk or
// roadway — so a fixed budget covers the whole block. near/far layers hand off by distance.
export function makeDabMaterial(
  opts: {
    sway?: number;
    falling?: boolean;
    opacity?: number;
    flat?: boolean;
    solid?: boolean;
    carpet?: { box: number; near: boolean };
    role?: 'crown' | 'bark' | 'ground' | 'kit' | 'shrub';
  } = {},
) {
  return new THREE.ShaderMaterial({
    transparent: !opts.solid,
    depthWrite: !!opts.solid,
    defines: {
      FALLING: opts.falling ? 1 : 0,
      FLAT: opts.flat ? 1 : 0,
      SOLID: opts.solid ? 1 : 0,
      CARPET: opts.carpet ? 1 : 0,
      CARPET_NEAR: opts.carpet?.near ? 1 : 0,
      ROLE: { crown: 0, bark: 1, ground: 2, kit: 3, shrub: 4 }[opts.role ?? (opts.carpet ? 'ground' : 'kit')],
    },
    uniforms: {
      ...U,
      uSway: { value: opts.sway ?? 0 },
      uOpacity: { value: opts.opacity ?? 0.8 },
      uBox: { value: opts.carpet?.box ?? 0 },
      uEuclid: { value: new THREE.Vector2(EUCLID.roadHalf, EUCLID.rowHalf) },
      uCase: { value: new THREE.Vector2(CASE.roadHalf, CASE.rowHalf) },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform sampler2D uNoise;
      uniform vec3 uPaper;
      uniform vec3 uWash[5];
      uniform vec3 uFoliage[8];
      uniform vec3 uEarth[6];
      uniform vec3 uCarriage[9];
      uniform float uPxScale;
      uniform float uSway;
      uniform float uBox;
      uniform vec2 uEuclid;
      uniform vec2 uCase;
      uniform float uEvidence;
      uniform float uAtlas;
      uniform vec2 uRevealCenter;
      uniform float uRevealRadius;
      // live generator parameters (see settings/schema.ts)
      uniform float uG_jitter, uG_jitterSpeed, uG_breathe, uG_sway, uG_groundDrift;
      uniform float uG_crownDot, uG_barkDot, uG_groundDot, uG_paperMix, uG_hazeNear, uG_hazeFar, uG_haze;
      uniform float uG_mound, uG_tuft, uG_lawnLight, uG_pink, uG_lavender, uG_litter, uG_roadTone;
      attribute float aSize;
      attribute float aTint;
      attribute float aSeed;
      varying vec3 vCol;
      varying float vSeed;
      varying float vAlpha;
      varying float vSquash;
      varying float vInk;

      float hash2(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

      void main() {
        vec3 p = position;
        float tint = aTint;
        float size0 = aSize;
        #if CARPET
        {
          // wrap into a box centred on the camera; the point's world position stays put until it
          // falls off one edge and reappears on the other
          vec2 q = cameraPosition.xz + mod(position.xz - cameraPosition.xz, uBox) - uBox * 0.5;
          float de = abs(q.y), dc = abs(q.x);
          float road = max(step(de, uEuclid.x), step(dc, uCase.x));
          float row = max(step(de, uEuclid.y), step(dc, uCase.y));
          float cN = texture2D(uNoise, q * 0.018).r;
          float cN2 = texture2D(uNoise, q * 0.09 + 0.31).r;
          float cH = hash2(vec2(aSeed, 1.9)), cG = hash2(vec2(aSeed, 7.3));
          float away = clamp(min(de - uEuclid.y, dc - uCase.y) / 10.0, 0.0, 1.0);
          if (road > 0.5) {
            // the roadway: a low, peachy path with ruts a shade deeper
            float across = de < uEuclid.x ? de : dc;
            float rut = exp(-pow((across - 2.4) / 0.6, 2.0)) + exp(-pow((across - 6.3) / 0.6, 2.0));
            p.y = 0.02 + cH * 0.06;
            tint = cG < 0.06 ? 2.5 + cH * 2.0 : 10.0 + clamp(uG_roadTone + cN * 2.0 + (cH - 0.5) * 1.2 - rut * 0.9, 0.0, 4.99);
          } else if (row > 0.5) {
            // sidewalk flags
            p.y = 0.04 + cH * 0.08;
            tint = 10.0 + clamp(3.0 + cN2 * 1.8 + (cH - 0.5) * 0.8, 0.0, 4.99);
          } else {
            // lawns swell into soft mounds and tufts as they run back from the street
            p.y = (cN * 0.6 + cN2 * 0.3) * (0.25 + 0.75 * away) * uG_mound + cH * uG_tuft;
            float light = clamp(0.12 + uG_lawnLight + cN2 * 0.62 + (cH - 0.5) * 0.55 + p.y * 0.2, 0.0, 1.0);
            tint = light * 5.0;
            if (cG < uG_pink) tint = 6.0;                                            // pink
            else if (cG < uG_pink + uG_lavender) tint = 7.0;                         // lavender
            else if (cG < uG_pink + uG_lavender + uG_litter) tint = 12.0 + cH * 2.5; // peach leaf litter
          }
          p.xz = q;
          float dist = length(q - cameraPosition.xz) / (uBox * 0.5);
          #if CARPET_NEAR
            size0 *= 1.0 - smoothstep(0.7, 1.0, dist);       // fine layer hands off at its edge
          #else
            size0 *= smoothstep(0.08, 0.2, dist) * (1.0 - smoothstep(0.75, 1.0, dist));
          #endif
          size0 *= road > 0.5 ? 0.8 : 1.0;
        }
        #endif
        #if FALLING
          // leaves drift down and downwind inside a box that follows the camera
          vec3 drift = vec3(uTime * 0.55, -uTime * (0.6 + aSeed * 0.5), uTime * 0.25);
          drift.x += sin(uTime * 1.3 + aSeed * 40.0) * 0.8;
          p = mod(p + drift - cameraPosition + 40.0, 80.0) - 40.0 + cameraPosition;
          p.y = mod(position.y + drift.y, 22.0) + 0.1;
        #endif
        vec4 wp = modelMatrix * vec4(p, 1.0);
        float h = clamp(wp.y / 18.0, 0.0, 1.0);
        wp.x += sin(uTime * 0.8 + aSeed * 6.28 + wp.z * 0.05) * 0.22 * h * uSway * uG_sway;
        wp.z += cos(uTime * 0.6 + aSeed * 4.0) * 0.16 * h * uSway * uG_sway;

        // Brownian drift: summed sines at unrelated frequencies with a per-dot phase, so every
        // dot wanders on its own path (cheap, stateless, and never drifts away for good)
        float ts = uTime * uG_jitterSpeed;
        vec3 bm = vec3(
          sin(ts + aSeed * 61.0) + 0.6 * sin(ts * 2.31 + aSeed * 17.0) + 0.35 * sin(ts * 4.7 + aSeed * 5.3),
          sin(ts * 1.17 + aSeed * 43.0) + 0.6 * sin(ts * 2.73 + aSeed * 29.0),
          sin(ts * 0.93 + aSeed * 37.0) + 0.6 * sin(ts * 2.09 + aSeed * 11.0) + 0.35 * sin(ts * 5.1 + aSeed * 7.7)
        ) / 1.95;
        #if ROLE == 0
          float jm = 1.0; float dotMul = uG_crownDot;
        #elif ROLE == 1
          float jm = 0.25; float dotMul = uG_barkDot;
        #elif ROLE == 2
          float jm = uG_groundDrift; float dotMul = uG_groundDot; bm.y *= 0.5;
        #elif ROLE == 4
          float jm = 0.6; float dotMul = uG_crownDot;
        #else
          float jm = 0.08; float dotMul = 1.0;
        #endif
        wp.xyz += bm * uG_jitter * jm;

        // the same radial reveal as the drawing: dabs bloom as the street sketches in
        float d = distance(wp.xz, uRevealCenter);
        float n = texture2D(uNoise, wp.xz * 0.012).r * 26.0 + hash2(floor(wp.xz * 0.35)) * 6.0;
        float rev = clamp((uRevealRadius - d - n) / 12.0, 0.0, 1.0);
        // Atlas: every dot the paint hasn't reached is drawn in ink instead (and is on screen)
        float inkA = uAtlas * (1.0 - rev);
        float vis = max(rev, step(texture2D(uNoise, wp.xz * 0.009).r * 0.8 + 0.1, uAtlas));
        float gather = 0.0;
        #if !FALLING
        {
          // gathering: the drawing front sweeps the dots in. Ahead of it each dot waits a little
          // further out and up, small, and drifts inward to its place as the front passes (a wider
          // band than the bloom, so it reads as motion)
          gather = 1.0 - clamp((uRevealRadius - d - n) / 40.0, 0.0, 1.0);
          gather *= gather;
          gather *= 1.0 - inkA;
          vec2 outward = normalize(wp.xz - uRevealCenter + vec2(1e-3));
          vec3 from = vec3(outward.x + hash2(vec2(aSeed, 1.1)) - 0.5, 0.2 + 0.7 * hash2(vec2(aSeed, 2.3)), outward.y + hash2(vec2(aSeed, 3.7)) - 0.5);
          wp.xyz += from * (2.0 + 5.0 * hash2(vec2(aSeed, 5.1))) * gather;
        }
        #endif
        vec4 mv = viewMatrix * wp;
        gl_Position = projectionMatrix * mv;
        float depth = max(-mv.z, 0.1);

        float size = size0 * dotMul * uPxScale / depth;
        size *= 1.0 + uG_breathe * min(jm, 1.0) * sin(ts * 1.6 + aSeed * 90.0);
        size *= 1.0 - pow(1.0 - vis, 3.0);
        #if CARPET || FALLING
          size *= 1.0 - inkA;                               // the Atlas draws its own ground
          inkA = 0.0;
        #endif
        #if ROLE == 0 || ROLE == 1 || ROLE == 4
          size *= 1.0 - inkA;                               // the Atlas draws trees and shrubs as single shapes
        #else
          size *= mix(1.0, 1.35, inkA);
        #endif
        vInk = inkA;
        size *= 1.0 - 0.7 * gather;                         // scattered dots are small; they swell as they settle
        size *= smoothstep(1.2, 4.0, depth);                // don't paint over the lens
        size *= step(aSeed, 1.0 - uEvidence * 0.85);       // evidence mode: the impression thins out
        gl_PointSize = min(size, 180.0);

        // ramp through the five washes, then lighten some toward the paper
        vec3 c;
        #if SOLID
          if (tint >= 20.0) {
            // carriage ramp (scene/Carriages.tsx picks tints inside its coach / horse / accent runs)
            float t = clamp(tint - 20.0, 0.0, 7.999);
            int i = int(floor(t));
            c = mix(uCarriage[i], uCarriage[i + 1], fract(t));
          } else if (tint >= 10.0) {
            float t = clamp(tint - 10.0, 0.0, 4.999);
            int i = int(floor(t));
            c = mix(uEarth[i], uEarth[i + 1], fract(t));
          } else if (tint >= 7.0) c = uFoliage[7];
          else if (tint >= 6.0) c = uFoliage[6];
          else {
            float t = clamp(tint, 0.0, 4.999);
            int i = int(floor(t));
            c = mix(uFoliage[i], uFoliage[i + 1], fract(t));
          }
          c = mix(c, uPaper, hash2(vec2(aSeed, 3.7)) * uG_paperMix);
        #else
          float t = clamp(aTint, 0.0, 3.999);
          int i = int(floor(t));
          c = mix(uWash[i], uWash[i + 1], fract(t));
          c = mix(c, uPaper, hash2(vec2(aSeed, 3.7)) * 0.3);
        #endif
        vCol = c;
        vSeed = aSeed;
        // washes lying on the ground foreshorten into ellipses
        vSquash = 1.0;
        #if FLAT
          vSquash = clamp(abs(normalize(cameraPosition - wp.xyz).y) * 1.6, 0.18, 1.0);
        #endif
        vAlpha = smoothstep(0.5, 2.0, gl_PointSize) * (1.0 - smoothstep(180.0, 520.0, depth));
        #if SOLID
          // opaque paint can't fade by alpha: recede into the paper instead
          vCol = mix(vCol, uPaper, smoothstep(uG_hazeNear, max(uG_hazeFar, uG_hazeNear + 1.0), depth) * uG_haze);
          // a zero point size still rasterises as one pixel on some GPUs (ANGLE/Metal): move hidden
          // dots out of the clip volume instead
          if (gl_PointSize < 0.8) { gl_PointSize = 0.0; gl_Position = vec4(2.0, 2.0, 2.0, 1.0); }
        #endif
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uNoise;
      uniform float uOpacity;
      varying vec3 vCol;
      varying float vSeed;
      varying float vAlpha;
      varying float vSquash;
      varying float vInk;
      uniform vec3 uPaper;
      uniform vec3 uPencil;
      void main() {
        vec2 q = gl_PointCoord * 2.0 - 1.0;
        q.y /= vSquash;
        float d = length(q);
        float ang = atan(q.y, q.x);
        // irregular, bleeding rim
        float rim = 0.78 + 0.22 * texture2D(uNoise, vec2(ang * 0.159 + vSeed * 7.0, vSeed * 3.1)).r;
        if (d > rim) discard;
        float edge = smoothstep(rim - 0.3, rim, d);             // pigment pools at the edge
        float gran = texture2D(uNoise, gl_PointCoord * 0.4 + vSeed * 9.0).g;  // paper granulation
        #if SOLID
          vec3 col = vCol * mix(1.0, 0.88, edge) * (0.95 + 0.08 * gran);
          if (vInk > 0.001) {
            // Atlas: the same dot as an engraver's mark. Crowns and shrubs are paper discs with an
            // ink rim (overlapping, they make scalloped tree outlines) and hatching on the shade
            // side; everything else is a plain ink dot
            float shade = clamp(1.0 - dot(vCol, vec3(0.3, 0.59, 0.11)) / dot(uPaper, vec3(0.3, 0.59, 0.11)), 0.0, 1.0);
            #if ROLE == 0 || ROLE == 4
              float hl = step(0.55, abs(fract((gl_PointCoord.x + gl_PointCoord.y) * 4.0 + vSeed) - 0.5) * 2.0) * smoothstep(0.25, 0.5, shade);
              vec3 fill = mix(uPaper, uPencil, 0.04 + shade * 0.18 + hl * 0.3);
              vec3 ink = mix(fill, uPencil, smoothstep(rim - 0.2, rim - 0.1, d) * 0.85);
            #else
              vec3 ink = mix(uPencil, uPaper, 0.2 + 0.45 * (1.0 - shade));
            #endif
            col = mix(col, ink * (0.97 + 0.05 * gran), vInk);
          }
          gl_FragColor = vec4(col, 1.0);
        #else
          vec3 col = vCol * mix(1.0, 0.8 + 0.12 * (1.0 - vSquash), edge) * (0.93 + 0.12 * gran);
          float a = uOpacity * vAlpha * mix(0.72, 1.0, edge) * (0.85 + 0.15 * gran);
          gl_FragColor = vec4(col, a);
        #endif
        #include <colorspace_fragment>
      }
    `,
  });
}

// ---------------------------------------------------------------------------------------------
// Atlas trees: one shape per tree instead of its crown dots, after loose watercolour tree studies.
// A screen-facing quad stands on the trunk's foot; the crown is a lobed blot (an elm's vase: wider
// at the top) washed in a muted sage, darker where the pigment pools at its rim and on the side
// away from the low south-west sun, with paler blooms and a broken ink contour; a thin forked trunk
// below. The quad is foreshortened like a real vertical (cos of the camera's pitch), so trees sit
// on the oblique ground. Only drawn where the Atlas shows and the paint hasn't arrived.
// ---------------------------------------------------------------------------------------------
const ATLAS_TREE_VARY = /* glsl */ `
  attribute vec4 iCrown; // x, z, crown bottom, crown top
  attribute vec3 iShape; // radius, seed, autumn
  varying vec2 vM;       // position on the quad in metres (x across, y up from the foot)
  varying vec2 vBase;
  varying float vCrownY, vR, vSeed, vAut;
`;
export function makeAtlasTreeMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { ...U },
    vertexShader: /* glsl */ `
      ${ATLAS_TREE_VARY}
      void main() {
        vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
        vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
        float cosP = clamp(up.y, 0.25, 1.0);
        float r = iShape.x;
        float crownY = (iCrown.z + iCrown.w) * 0.5 * cosP;
        float w = r * 1.3, h = crownY + r * 1.3;
        vM = vec2(position.x * w, position.y * h);
        vBase = iCrown.xy;
        vCrownY = crownY; vR = r; vSeed = iShape.y; vAut = iShape.z;
        vec3 wp = vec3(iCrown.x, 0.0, iCrown.y) + right * vM.x + up * vM.y;
        gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      uniform vec3 uFoliage[8];
      uniform vec3 uEarth[6];
      varying vec2 vM;
      varying vec2 vBase;
      varying float vCrownY, vR, vSeed, vAut;
      float seg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0)); }
      void main() {
        if (atlasIn(vBase) * (1.0 - reveal(vBase)) < 0.5) discard;
        float s = vSeed;
        // crown: a lobed blot, wider toward the top like an elm's vase
        vec2 q = vec2(vM.x, vM.y - vCrownY) / vR;
        q.x /= mix(0.82, 1.1, clamp(q.y * 0.5 + 0.5, 0.0, 1.0));
        float ang = atan(q.y, q.x), rad = length(q);
        float edge = 0.92 + 0.09 * sin(3.0 * ang + s * 6.28) + 0.06 * sin(5.0 * ang + s * 17.0) + 0.04 * sin(9.0 * ang + s * 31.0)
                   + 0.16 * (noise2(q * 0.3 + s * 7.0) - 0.5);
        float aa = fwidth(rad) * 1.2;
        float crown = 1.0 - smoothstep(edge - aa, edge + aa, rad);
        // trunk: tapering, a little crooked, forking into the crown
        float wob = (noise2(vec2(vM.y * 0.06, s * 9.0)) - 0.5) * 0.5;
        float tw = 0.16 + 0.1 * (1.0 - clamp(vM.y / max(vCrownY, 0.1), 0.0, 1.0));
        float trunk = (1.0 - smoothstep(tw - 0.04, tw + 0.04, abs(vM.x - wob))) * step(vM.y, vCrownY - vR * 0.35);
        vec2 fork = vec2(0.0, vCrownY - vR * 0.55);
        float limbs = min(seg(vM, fork, fork + vec2(-vR * 0.35, vR * 0.5)), seg(vM, fork, fork + vec2(vR * 0.3, vR * 0.45)));
        trunk = max(trunk, (1.0 - smoothstep(0.08, 0.14, limbs)) * step(vM.y, vCrownY));
        float a = max(crown, trunk);
        if (a < 0.02) discard;

        // the wash: a muted sage from pale to deep, each tree its own green, a breath of autumn
        float n1 = noise2(q * 0.3 + s * 3.1), n2 = noise2(q * 0.2 + s * 5.3 + 0.37);
        vec3 deep = mix(mix(uFoliage[0], uEarth[0], vAut * 0.25), uPencil, 0.38);
        vec3 pale = mix(mix(uFoliage[2], uFoliage[1], fract(s * 7.31)), uPaper, 0.4);
        // lit from the low south-west: pale up and to the left, pooled dark low and to the right
        float light = clamp(0.62 - 0.34 * q.x + 0.38 * q.y + (n1 - 0.5) * 0.6, 0.0, 1.0);
        float dens = 0.15 + 0.6 * (1.0 - light);
        dens += smoothstep(0.78, 1.0, rad / edge) * 0.22;                       // pigment pools at the rim
        dens += smoothstep(-0.1, -0.9, q.y) * 0.18;                              // and settles low
        // one or two soft blooms where the wash was lifted, with a faint tide line round them
        float bloom = smoothstep(0.5, 0.72, n2) * light;
        float tide = (1.0 - smoothstep(0.0, 0.035, abs(n2 - 0.5))) * 0.12;
        dens = clamp(dens * (1.0 - 0.6 * bloom) + tide, 0.0, 1.0);
        vec3 c = mix(pale, deep, dens);
        c = mix(c, uPaper, bloom * 0.35);
        float contour = smoothstep(0.93, 0.995, rad / edge) * step(0.4, noise2(vec2(ang * 1.7, s * 4.0)));
        c = mix(c, uPencil, contour * 0.3);
        vec3 bark = mix(uPencil, uPaper, 0.4);
        vec3 col = mix(bark, c, crown);
        if (a < 0.5) discard;
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
}

// the tree's shadow: a pale wash on the ground, thrown north-east from the low south-west sun
export function makeAtlasShadowMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { ...U },
    vertexShader: /* glsl */ `
      ${ATLAS_TREE_VARY}
      void main() {
        float r = iShape.x;
        float h = (iCrown.z + iCrown.w) * 0.5;
        vec2 c = iCrown.xy + vec2(0.55, -0.6) * h * 0.55;
        vM = position.xy * r * 1.5;
        vBase = iCrown.xy;
        vCrownY = h; vR = r; vSeed = iShape.y; vAut = iShape.z;
        gl_Position = projectionMatrix * viewMatrix * vec4(c.x + vM.x, 0.06, c.y + vM.y, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      varying vec2 vM;
      varying vec2 vBase;
      varying float vCrownY, vR, vSeed, vAut;
      void main() {
        if (atlasIn(vBase) * (1.0 - reveal(vBase)) < 0.5) discard;
        vec2 q = vM / vR;
        q = vec2(q.x * 0.8 + q.y * 0.35, q.y * 0.9);  // stretched along the throw
        float ang = atan(q.y, q.x);
        float edge = 0.95 + 0.08 * sin(3.0 * ang + vSeed * 6.28) + 0.12 * (noise2(q * 0.3 + vSeed * 7.0) - 0.5);
        float m = 1.0 - smoothstep(edge - 0.12, edge, length(q));
        if (m < 0.01) discard;
        float n = noise2(q * 0.8 + vSeed * 2.0);
        gl_FragColor = vec4(mix(uPaper, uPencil, 0.5), m * (0.16 + 0.06 * n));
        #include <colorspace_fragment>
      }
    `,
  });
}
