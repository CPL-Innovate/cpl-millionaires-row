import * as THREE from 'three';

// Threads: a night (or dusk) grade over everything that draws. Every material here ends with
// <colorspace_fragment>, and three prefixes every ShaderMaterial with <colorspace_pars_fragment>,
// so the grade lives in those two chunks instead of in each shader. A material without uNight
// reads 0 and is untouched. A fragment that is a light source sets gNightKeep (window glow) and a
// whole material can opt out with uNoNight (lamp glass). uSnow is the same idea for a winter.
THREE.ShaderChunk.colorspace_pars_fragment += /* glsl */ `
uniform float uNight;
uniform float uNoNight;
uniform vec3 uNightTint;
uniform float uSnow;
float gNightKeep = 0.0;
vec3 nightGrade(vec3 c) {
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  // winter (The Starting Line): colour drains toward cold snow-light, darks kept as ink
  vec3 w = mix(vec3(l) * vec3(0.9, 0.94, 1.0), vec3(0.93, 0.95, 0.98), 0.35 + 0.5 * l);
  c = mix(c, w, uSnow * 0.85 * (1.0 - uNoNight));
  vec3 g = mix(vec3(l), c, 0.45) * uNightTint;
  return mix(c, g, uNight * (1.0 - max(uNoNight, gNightKeep)));
}
`;
THREE.ShaderChunk.colorspace_fragment = /* glsl */ `
gl_FragColor.rgb = nightGrade(gl_FragColor.rgb);
` + THREE.ShaderChunk.colorspace_fragment;
