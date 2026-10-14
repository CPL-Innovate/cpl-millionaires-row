// Every generative parameter in one place. `live` parameters are shader uniforms and change
// instantly; the rest regenerate geometry (debounced) when they change.

export interface ParamDef {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  def: number;
  live?: boolean;
  hint?: string;
}

export interface Group {
  id: string;
  label: string;
  params: ParamDef[];
}

export const GROUPS: Group[] = [
  {
    id: 'motion',
    label: 'Motion',
    params: [
      { key: 'jitter', label: 'Brownian drift', min: 0, max: 0.5, step: 0.005, def: 0.07, live: true, hint: 'How far each dot wanders (m)' },
      { key: 'jitterSpeed', label: 'Drift speed', min: 0, max: 3, step: 0.01, def: 0.55, live: true },
      { key: 'breathe', label: 'Breathing', min: 0, max: 0.6, step: 0.01, def: 0.12, live: true, hint: 'Dots swell and shrink' },
      { key: 'sway', label: 'Crown sway', min: 0, max: 3, step: 0.01, def: 1, live: true },
      { key: 'groundDrift', label: 'Ground drift share', min: 0, max: 2, step: 0.01, def: 1, live: true, hint: 'Drift on the ground relative to crowns' },
    ],
  },
  {
    id: 'paint',
    label: 'Paint',
    params: [
      { key: 'crownDot', label: 'Crown dot size', min: 0.3, max: 2.5, step: 0.01, def: 1, live: true },
      { key: 'barkDot', label: 'Bark dot size', min: 0.3, max: 2.5, step: 0.01, def: 1, live: true },
      { key: 'groundDot', label: 'Ground dot size', min: 0.3, max: 2.5, step: 0.01, def: 1, live: true },
      { key: 'paperMix', label: 'Lighten toward paper', min: 0, max: 0.6, step: 0.01, def: 0.1, live: true },
      { key: 'hazeNear', label: 'Haze starts (m)', min: 0, max: 200, step: 1, def: 30, live: true },
      { key: 'hazeFar', label: 'Haze full (m)', min: 40, max: 700, step: 1, def: 300, live: true },
      { key: 'haze', label: 'Haze strength', min: 0, max: 1, step: 0.01, def: 0.85, live: true },
    ],
  },
  {
    id: 'ground',
    label: 'Ground',
    params: [
      { key: 'mound', label: 'Lawn mounds', min: 0, max: 3, step: 0.01, def: 1, live: true },
      { key: 'tuft', label: 'Tuft height', min: 0, max: 1, step: 0.01, def: 0.25, live: true },
      { key: 'lawnLight', label: 'Lawn lightness', min: -0.5, max: 0.5, step: 0.01, def: 0, live: true },
      { key: 'pink', label: 'Pink accents', min: 0, max: 0.15, step: 0.001, def: 0.025, live: true },
      { key: 'lavender', label: 'Lavender accents', min: 0, max: 0.1, step: 0.001, def: 0.01, live: true },
      { key: 'litter', label: 'Leaf litter', min: 0, max: 0.6, step: 0.005, def: 0.125, live: true },
      { key: 'roadTone', label: 'Road tone', min: 0, max: 4, step: 0.01, def: 2.5, live: true, hint: 'Terracotta ← → sand' },
      { key: 'nearCount', label: 'Near dots', min: 20000, max: 400000, step: 5000, def: 190000 },
      { key: 'nearBox', label: 'Near field (m)', min: 30, max: 150, step: 1, def: 70 },
      { key: 'farCount', label: 'Far dots', min: 0, max: 300000, step: 5000, def: 120000 },
      { key: 'farBox', label: 'Far field (m)', min: 150, max: 800, step: 5, def: 380 },
    ],
  },
  {
    id: 'planting',
    label: 'Planting',
    params: [
      { key: 'seed', label: 'Seed', min: 1, max: 9999, step: 1, def: 7 },
      { key: 'spacing', label: 'Spacing min (m)', min: 4, max: 25, step: 0.5, def: 9 },
      { key: 'spacingRange', label: 'Spacing variation (m)', min: 0, max: 20, step: 0.5, def: 8 },
      { key: 'gap', label: 'Missing trees', min: 0, max: 0.6, step: 0.01, def: 0.08 },
      { key: 'pair', label: 'Paired trees', min: 0, max: 0.5, step: 0.01, def: 0.06 },
      { key: 'offset', label: 'Off-line jitter (m)', min: 0, max: 4, step: 0.1, def: 1.4 },
      { key: 'lawnTrees', label: 'Lawn trees', min: 0, max: 80, step: 1, def: 26 },
    ],
  },
  {
    id: 'form',
    label: 'Tree form',
    params: [
      { key: 'vase', label: 'Vase elms (weight)', min: 0, max: 1, step: 0.01, def: 0.68 },
      { key: 'round', label: 'Round crowns (weight)', min: 0, max: 1, step: 0.01, def: 0.2 },
      { key: 'column', label: 'Upright (weight)', min: 0, max: 1, step: 0.01, def: 0.12 },
      { key: 'young', label: 'Young trees', min: 0, max: 0.6, step: 0.01, def: 0.1 },
      { key: 'old', label: 'Old giants', min: 0, max: 0.6, step: 0.01, def: 0.1 },
      { key: 'treeScale', label: 'Overall size', min: 0.5, max: 1.6, step: 0.01, def: 1 },
      { key: 'crook', label: 'Crookedness', min: 0, max: 1.2, step: 0.01, def: 0.5 },
      { key: 'prune', label: 'Asymmetry', min: 0, max: 0.6, step: 0.01, def: 0.22 },
      { key: 'lean', label: 'Lean', min: 0, max: 0.4, step: 0.005, def: 0.1 },
      { key: 'reach', label: 'Reach over street', min: 0, max: 0.5, step: 0.005, def: 0.12 },
      { key: 'barkDensity', label: 'Bark dot density', min: 0.2, max: 1.5, step: 0.01, def: 1, hint: 'Bark is most of the scene’s dots; Light halves it' },
    ],
  },
  {
    id: 'foliage',
    label: 'Foliage',
    params: [
      { key: 'density', label: 'Crown density', min: 0.1, max: 1.5, step: 0.01, def: 0.85 },
      { key: 'densityVar', label: 'Density variation', min: 0, max: 0.6, step: 0.01, def: 0.2 },
      { key: 'autumnMin', label: 'Autumn: greenest tree', min: 0, max: 1, step: 0.01, def: 0 },
      { key: 'autumnMax', label: 'Autumn: most turned', min: 0, max: 1, step: 0.01, def: 1 },
      { key: 'turning', label: 'Peach / terracotta leaves', min: 0, max: 1.5, step: 0.01, def: 0.7 },
      { key: 'accents', label: 'Crown accents', min: 0, max: 3, step: 0.01, def: 1.1 },
      { key: 'shrubs', label: 'Shrub dots per clump', min: 0, max: 200, step: 1, def: 70 },
      { key: 'leaves', label: 'Falling leaves', min: 0, max: 1000, step: 10, def: 140 },
    ],
  },
];

export const ALL_PARAMS = GROUPS.flatMap((g) => g.params);
export const LIVE_KEYS = ALL_PARAMS.filter((p) => p.live).map((p) => p.key);
export const REBUILD_KEYS = ALL_PARAMS.filter((p) => !p.live).map((p) => p.key);
export const DEFAULTS: Record<string, number> = Object.fromEntries(ALL_PARAMS.map((p) => [p.key, p.def]));

// editable colour ramps (per palette)
export const COLOR_RAMPS = [
  { key: 'foliage', label: 'Foliage', names: ['Shadow', 'Deep', 'Body', 'Light', 'Sunlit', 'Highlight', 'Pink', 'Lavender'] },
  { key: 'earth', label: 'Earth', names: ['Shadow', 'Terracotta', 'Brown', 'Peach', 'Sand', 'Cream'] },
] as const;
export type RampKey = (typeof COLOR_RAMPS)[number]['key'];

// Eras: "Painterly" is the base settings, tuned for the eye. "1888" is a layer on top, calibrated to
// the archive: late October 1888, when nearly every photograph shows bare-branched elms (and canopy
// would hide the façades), mown lawns, and no flower-coloured flecks no 1888 lawn ever had. Each era
// keeps its own Generator tweaks; this is only 1888's starting point.
export type EraId = 'painterly' | '1888';
export const ERAS: { id: EraId; label: string; note: string }[] = [
  { id: 'painterly', label: 'Painterly', note: 'The impression: autumn crowns, mounded lawns, bright accents.' },
  { id: '1888', label: '1888', note: 'Calibrated to the photographs: near-bare elms, mown lawns, fallen leaves, October colour.' },
];
export const ERA_1888 = {
  v: {
    // elms nearly bare, every tree turned: what leaves remain are elm yellow, the odd maple rust
    density: 0.1, densityVar: 0.08, autumnMin: 0.8, autumnMax: 1, turning: 1.1, accents: 0.35, crownDot: 0.8,
    // mown lawns, a scatter of fallen leaves, no pink or lavender flecks
    mound: 0.12, tuft: 0.03, lawnLight: -0.08, pink: 0, lavender: 0, litter: 0.24,
    leaves: 90, sway: 0.6,
  } as Record<string, number>,
  // foliage ramp, shadow → light (lawn olive → elm yellow → cream), then the two accent slots
  // become maple rust and oak brown
  colors: {
    graphite: { foliage: ['#8a9655', '#a2a95e', '#bbb869', '#d4c575', '#ead48a', '#f7ebc6', '#c66a48', '#a07f5e'] },
    sepia: { foliage: ['#948748', '#ab9d52', '#c4b062', '#dbc277', '#ecd69c', '#f8ebcb', '#b86048', '#94714c'] },
  } as Partial<Record<string, { foliage?: string[] }>>,
};

// Quality: "Light" trades dot budget and pixel density for frame rate (phones, older laptops). It
// sits over whichever era is showing and isn't edited by the Generator.
export type QualityId = 'full' | 'light';
export const QUALITIES: { id: QualityId; label: string; dpr: [number, number] }[] = [
  { id: 'full', label: 'Full', dpr: [1, 2] },
  { id: 'light', label: 'Light', dpr: [1, 1] },
];
export const QUALITY_LIGHT: Record<string, number> = {
  barkDensity: 0.45, // bark is ~60% of all dots in Full
  nearCount: 70000, farCount: 45000, groundDot: 1.25, // fewer, slightly larger ground dots
  shrubs: 40, leaves: 50,
};

// Watercolour look, per modelled house (Generator → Watercolour · per house). Live shader uniforms,
// one set per house, named uW_<key>; saved under Settings.houses[houseId].
export const WASH_PARAMS: ParamDef[] = [
  { key: 'pigment', label: 'Pigment load', min: 0.2, max: 1.2, step: 0.01, def: 0.6, live: true, hint: 'How much paint the lit walls carry' },
  { key: 'shadowDepth', label: 'Shadow wash depth', min: 0, max: 0.6, step: 0.01, def: 0.34, live: true, hint: 'Extra pigment in the mid-tone and shadow washes' },
  { key: 'lightness', label: 'Lightness', min: -0.3, max: 0.5, step: 0.01, def: 0, live: true, hint: 'Toward the paper (+) or deeper (−)' },
  { key: 'paletteTint', label: 'Pull toward palette', min: 0, max: 1, step: 0.01, def: 0.22, live: true, hint: 'Texture colour → the palette’s earth ramp' },
  { key: 'saturation', label: 'Saturation', min: 0, max: 2, step: 0.01, def: 1.3, live: true },
  { key: 'violet', label: 'Violet in shadows', min: 0, max: 1, step: 0.01, def: 0.3, live: true },
  { key: 'warmth', label: 'Warm sunlit side', min: 0, max: 0.3, step: 0.005, def: 0.06, live: true },
  { key: 'wobble', label: 'Wash edge wobble', min: 0, max: 1, step: 0.01, def: 0.3, live: true, hint: 'How far the wash boundaries wander' },
  { key: 'wetEdges', label: 'Wet edges', min: 0, max: 0.5, step: 0.005, def: 0.12, live: true, hint: 'Pigment pooling where a wash stops' },
  { key: 'granulation', label: 'Granulation', min: 0, max: 0.8, step: 0.01, def: 0.3, live: true },
  { key: 'reserve', label: 'Reserved whites', min: 0, max: 1, step: 0.01, def: 0.85, live: true, hint: 'Bare paper left on the brightest patches' },
  { key: 'bleed', label: 'Foot bleed (m)', min: 0, max: 2, step: 0.01, def: 0.45, live: true, hint: 'How far the wall fades into the lawn' },
  { key: 'pencil', label: 'Pencil in shadows', min: 0, max: 1, step: 0.01, def: 0.28, live: true },
  { key: 'softness', label: 'Texture softness', min: 0, max: 2, step: 0.01, def: 0.75, live: true, hint: 'Blurs the texture; high values smear across the model’s UV seams' },
  { key: 'relief', label: 'Surface relief', min: 0, max: 1.5, step: 0.01, def: 0.45, live: true, hint: 'How much the normal map shapes the washes' },
];
export const WASH_DEFAULTS: Record<string, number> = Object.fromEntries(WASH_PARAMS.map((p) => [p.key, p.def]));
// a house whose wall material is unknown starts grey, not palette earth
export const washDefaultsFor = (neutralWalls?: boolean): Record<string, number> =>
  neutralWalls ? { ...WASH_DEFAULTS, paletteTint: 0, saturation: 0.55 } : { ...WASH_DEFAULTS };
