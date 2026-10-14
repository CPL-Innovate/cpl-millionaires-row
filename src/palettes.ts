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
  // carriages, after a loose watercolour of a pair and a hack: coach indigo → slate → blue-grey,
  // horse umber → sienna → chestnut → cream (manes, sunlit backs), then ochre and cerulean accents
  carriage: [string, string, string, string, string, string, string, string, string];
  mark: string; // the Atlas's one colour: the lot under the cursor, hatched in
  plateColor: number; // how much of the plate's original colour survives in map mode (0 = pure duotone)
  ui: { bg: string; fg: string; muted: string; rule: string; accent: string };
}

export const PALETTES: Record<PaletteId, Palette> = {
  graphite: {
    id: 'graphite',
    label: 'Graphite',
    note: 'Pencil buildings in a pointillist landscape',
    wash: ['#65602a', '#465422', '#a66b18', '#8d330f', '#171e0d'],
    earth: ['#72321b', '#934826', '#b7683d', '#d28e5a', '#e5b580', '#f6dab5'],
    foliage: ['#36520f', '#517616', '#779c20', '#a4bc3b', '#d6d061', '#f6eba8', '#d6586c', '#553d8a'],
    carriage: ['#101625', '#2d3b5a', '#7c8ba6', '#28110a', '#6f1e0b', '#ab4317', '#ebd6b7', '#c46f12', '#1b4593'],
    paper: '#fbf4df',
    pencil: '#070606',
    ink: '#030201',
    faint: '#44392c',
    mark: '#8d100d',
    plateColor: 0.55,
    ui: { bg: 'rgba(242,232,212,0.92)', fg: '#2a2622', muted: '#6d6458', rule: 'rgba(42,38,34,0.18)', accent: '#7a3b2a' },
  },
  sepia: {
    id: 'sepia',
    label: 'Sepia ink',
    note: 'Echoes the albumen prints and stereographs',
    wash: ['#684318', '#523413', '#9a5414', '#651f07', '#1b0e06'],
    earth: ['#5c2411', '#7c391e', '#9f5830', '#be7f4a', '#d6a46c', '#ebca9a'],
    foliage: ['#41360c', '#5d4d11', '#866819', '#b1862b', '#d4a852', '#edce90', '#b14132', '#5a3352'],
    carriage: ['#17110e', '#32251e', '#735d4a', '#1d0d06', '#551708', '#8d3913', '#e2c490', '#a85c12', '#364a61'],
    paper: '#ead2a8',
    pencil: '#1b0b03',
    ink: '#060201',
    faint: '#63391a',
    mark: '#720b05',
    plateColor: 0.25,
    ui: { bg: 'rgba(236,214,174,0.93)', fg: '#3a2412', muted: '#7a5a3a', rule: 'rgba(58,36,18,0.2)', accent: '#8c2f1b' },
  },
  cyanotype: {
    id: 'cyanotype',
    label: 'Cyanotype',
    note: 'Architect’s blueprint: white line on Prussian blue',
    wash: ['#365d92', '#658bb7', '#b5cce0', '#ffffff', '#1d3d6f'],
    earth: ['#0b214f', '#132f64', '#244782', '#456ca4', '#809fc8', '#dae7ef'],
    foliage: ['#113372', '#20478a', '#3a65a4', '#648bbe', '#9cbadc', '#ffffff', '#e2a442', '#de778d'],
    carriage: ['#02091b', '#06183d', '#294f8d', '#113372', '#3a65a4', '#9cbadc', '#ffffff', '#e2a442', '#de778d'],
    paper: '#1f4a78',
    pencil: '#c6d8e7',
    ink: '#ffffff',
    faint: '#365885',
    mark: '#e2a442',
    plateColor: 0,
    ui: { bg: 'rgba(22,52,86,0.92)', fg: '#eef4f8', muted: '#a9c0d6', rule: 'rgba(238,244,248,0.2)', accent: '#f2d28b' },
  },
};
