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
