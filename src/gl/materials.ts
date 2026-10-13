import * as THREE from 'three';
import { U } from './uniforms';
import { EUCLID, CASE } from '../data/site';

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
// Surfaces: buildings and the Everett mesh. Provenance state is a uniform (0 photographed,
// 1 inferred, 2 invented) or, for the Everett mesh, derived per fragment from object-space
// normals (front + west photographed, roof inferred, north + east invented).
// ---------------------------------------------------------------------------------------------
export function makeSurfaceMaterial(opts: { state?: number; everett?: boolean; map?: THREE.Texture | null }) {
  return new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    defines: { EVERETT: opts.everett ? 1 : 0, USE_PHOTOMAP: opts.map ? 1 : 0 },
    uniforms: {
      ...U,
      uState: { value: opts.state ?? 1 },
      uMap: { value: opts.map ?? null },
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

      void main() {
        if (reveal(vWorld.xz) < 0.5) discard;

        vec3 n = normalize(vNormalW);
        if (!gl_FrontFacing) n = -n;

        float state = uState;
        #if EVERETT
          vec3 no = normalize(vNormalO);
          if (no.y > 0.6) state = 1.0;            // roof: inferred
          else if (no.z > 0.35) state = 0.0;      // south front: photographed
          else if (no.x < -0.35) state = 0.0;     // west side: photographed
          else state = 2.0;                       // north + east: invented
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
export function makeLineMaterial(opts: { state?: number; everett?: boolean; weight?: number }) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    defines: { EVERETT: opts.everett ? 1 : 0 },
    uniforms: { ...U, uState: { value: opts.state ?? 1 }, uWeight: { value: opts.weight ?? 1 } },
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
      varying vec3 vWorld;
      varying vec3 vPosO;
      varying float vDepth;
      varying float vDist;
      void main() {
        if (reveal(vWorld.xz) < 0.5) discard;
        float state = uState;
        #if EVERETT
          // object-space position heuristic matching the surface rule
          if (vPosO.z > 0.12 || vPosO.x < -0.3) state = 0.0;
          else state = 2.0;
          if (vPosO.y > 0.55 && state > 1.5) state = 1.0;
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
      varying vec2 vUv;
      varying vec3 vWorld;
      varying float vDepth;

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
        float n = noise2(vUv * vec2(0.9, 0.7)) + hash2(floor(vUv * vec2(28.0, 22.0))) * 0.35;
        float shown = step(1.0 - uOpacity * 1.35, n);
        vec3 c = texture2D(uPhoto, vUv).rgb;
        // soft vignette edge so it reads as a print held up to the street
        vec2 e = smoothstep(vec2(0.0), vec2(0.04), vUv) * smoothstep(vec2(0.0), vec2(0.04), 1.0 - vUv);
        float a = shown * e.x * e.y * min(1.0, uOpacity * 1.6);
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
      uniform float uPxScale;
      uniform float uSway;
      uniform float uBox;
      uniform vec2 uEuclid;
      uniform vec2 uCase;
      uniform float uEvidence;
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
        vec4 mv = viewMatrix * wp;
        gl_Position = projectionMatrix * mv;
        float depth = max(-mv.z, 0.1);

        // the same radial reveal as the drawing: dabs bloom as the street sketches in
        float d = distance(wp.xz, uRevealCenter);
        float n = texture2D(uNoise, wp.xz * 0.012).r * 26.0 + hash2(floor(wp.xz * 0.35)) * 6.0;
        float rev = clamp((uRevealRadius - d - n) / 12.0, 0.0, 1.0);

        float size = size0 * dotMul * uPxScale / depth;
        size *= 1.0 + uG_breathe * min(jm, 1.0) * sin(ts * 1.6 + aSeed * 90.0);
        size *= 1.0 - pow(1.0 - rev, 3.0);
        size *= smoothstep(1.2, 4.0, depth);                // don't paint over the lens
        size *= step(aSeed, 1.0 - uEvidence * 0.85);       // evidence mode: the impression thins out
        gl_PointSize = min(size, 180.0);

        // ramp through the five washes, then lighten some toward the paper
        vec3 c;
        #if SOLID
          if (tint >= 10.0) {
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
          if (gl_PointSize < 0.8) gl_PointSize = 0.0;
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
