// Three drawing treatments for the same scene. Every material reads these through shared uniforms,
// so switching palette is a uniform update, not a rebuild.

export type PaletteId = 'graphite' | 'sepia' | 'cyanotype';

export interface Palette {
  id: PaletteId;
  label: string;
  note: string;
  paper: string; // ground / fill
  pencil: string; // graphite strokes (inferred)
  ink: string; // photographed surfaces
  faint: string; // construction lines (invented)
  // watercolour washes for the environment, ramp order: grass, sage, ochre, sienna, evergreen
  wash: [string, string, string, string, string];
  // impressionist foliage ramp, shadow → light (6 steps), then two accents (pink, lavender)
  foliage: [string, string, string, string, string, string, string, string];
  // earth ramp for bark, iron, stone, dirt — shadow → light: violet shadow, umber, brown, tan, sand, cream
  earth: [string, string, string, string, string, string];
  plateColor: number; // how much of the plate's original colour survives in map mode (0 = pure duotone)
  ui: { bg: string; fg: string; muted: string; rule: string; accent: string };
}

export const PALETTES: Record<PaletteId, Palette> = {
  graphite: {
    id: 'graphite',
    label: 'Graphite',
    note: 'Pencil buildings in a pointillist landscape',
    wash: ['#a9a571', '#8f9b66', '#d3ad57', '#c47b45', '#55603f'],
    earth: ['#b27a5c', '#c8916c', '#dcab86', '#eac5a0', '#f3dbbc', '#fbeedb'],
    foliage: ['#7f9a45', '#99b552', '#b6cd63', '#d2df84', '#ece9a6', '#fbf6d4', '#ec9fae', '#9c86c2'],
    paper: '#fbf4df',
    pencil: '#2f2c29',
    ink: '#1d1610',
    faint: '#8d8273',
    plateColor: 0.55,
    ui: { bg: 'rgba(242,232,212,0.92)', fg: '#2a2622', muted: '#6d6458', rule: 'rgba(42,38,34,0.18)', accent: '#7a3b2a' },
  },
  sepia: {
    id: 'sepia',
    label: 'Sepia ink',
    note: 'Echoes the albumen prints and stereographs',
    wash: ['#ab8c57', '#9a7d4e', '#cc9b50', '#a9622f', '#5c4329'],
    earth: ['#a2694a', '#b98260', '#cf9f78', '#e0bb93', '#ecd2ae', '#f6e6cc'],
    foliage: ['#8a7f3e', '#a39548', '#c0ab58', '#d9c072', '#ebd49a', '#f7e8c6', '#d98a7a', '#a07c9a'],
    paper: '#ead2a8',
    pencil: '#5b3a1f',
    ink: '#2b170a',
    faint: '#a7825a',
    plateColor: 0.25,
    ui: { bg: 'rgba(236,214,174,0.93)', fg: '#3a2412', muted: '#7a5a3a', rule: 'rgba(58,36,18,0.2)', accent: '#8c2f1b' },
  },
  cyanotype: {
    id: 'cyanotype',
    label: 'Cyanotype',
    note: 'Architect’s blueprint: white line on Prussian blue',
    wash: ['#7fa3c7', '#a9c3dc', '#dbe7f1', '#ffffff', '#5f86b0'],
    earth: ['#3a6597', '#4d77a8', '#6990bd', '#8eaed2', '#bccfe5', '#eef4f8'],
    foliage: ['#4a7cb2', '#6390c2', '#83a9d2', '#a8c3e0', '#cddeef', '#ffffff', '#f2d28b', '#f0b6c4'],
    paper: '#1f4a78',
    pencil: '#e4edf4',
    ink: '#ffffff',
    faint: '#7f9fbf',
    plateColor: 0,
    ui: { bg: 'rgba(22,52,86,0.92)', fg: '#eef4f8', muted: '#a9c0d6', rule: 'rgba(238,244,248,0.2)', accent: '#f2d28b' },
  },
};
