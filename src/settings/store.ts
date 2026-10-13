import { useSyncExternalStore } from 'react';
import type { PaletteId } from '../palettes';
import { DEFAULTS, ERA_1888, QUALITY_LIGHT, REBUILD_KEYS, type EraId, type QualityId, type RampKey } from './schema';

// Settings = numeric parameters + per-palette colour overrides. Precedence on load:
// schema defaults < project defaults (public/settings.json) < this browser's autosave.
// The base is the "Painterly" era; "1888" is a layer over it (ERA_1888, then the user's own 1888
// tweaks in `eras`). Everything reads the effective view; edits go to whichever era is active.

export interface PaletteOverride {
  paper?: string;
  foliage?: string[];
  earth?: string[];
}
type Colors = Partial<Record<PaletteId, PaletteOverride>>;
export interface EraLayer {
  v?: Record<string, number>;
  colors?: Colors;
}
export interface Settings {
  v: Record<string, number>;
  colors: Colors;
  eras?: Partial<Record<EraId, EraLayer>>;
}

const AUTOSAVE = 'mr-settings-v1';
const PRESETS = 'mr-presets-v1';
const ERA = 'mr-era-v1';
const QUALITY = 'mr-quality-v1';

const clone = (s: Settings): Settings => JSON.parse(JSON.stringify(s));
const merge = (base: Settings, over?: Partial<Settings> | null): Settings => ({
  v: { ...base.v, ...(over?.v ?? {}) },
  colors: { ...base.colors, ...(over?.colors ?? {}) },
  eras: { ...base.eras, ...(over?.eras ?? {}) },
});

function readLocal<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function writeLocal(key: string, val: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    /* private mode or blocked storage: settings still work for this session */
  }
}

// colour overrides merge per palette (an era's foliage ramp leaves the base paper colour alone)
function mergeColors(...layers: (Colors | undefined)[]): Colors {
  const out: Colors = {};
  for (const l of layers) for (const [p, o] of Object.entries(l ?? {}) as [PaletteId, PaletteOverride][]) out[p] = { ...out[p], ...o };
  return out;
}

const urlEra = new URLSearchParams(location.search).get('era');
let era: EraId = urlEra === '1888' || urlEra === 'painterly' ? urlEra : (readLocal<EraId>(ERA) ?? 'painterly');
// touch devices start on Light unless this browser has chosen
const urlQuality = new URLSearchParams(location.search).get('quality');
let quality: QualityId =
  urlQuality === 'light' || urlQuality === 'full'
    ? urlQuality
    : (readLocal<QualityId>(QUALITY) ?? (matchMedia('(pointer: coarse)').matches ? 'light' : 'full'));

let project: Settings = { v: { ...DEFAULTS }, colors: {} };
let state: Settings = merge(project, readLocal<Settings>(AUTOSAVE));

function effective(s: Settings): Settings {
  let out = s;
  if (era !== 'painterly') {
    const mine = s.eras?.[era] ?? {};
    out = {
      v: { ...s.v, ...ERA_1888.v, ...(mine.v ?? {}) },
      colors: mergeColors(s.colors, ERA_1888.colors as Colors, mine.colors),
      eras: s.eras,
    };
  }
  if (quality === 'light') out = { ...out, v: { ...out.v, ...QUALITY_LIGHT } };
  return out;
}
let view = effective(state);

const rebuildOf = (s: Settings) => Object.fromEntries(REBUILD_KEYS.map((k) => [k, s.v[k]]));
let rebuild: Record<string, number> = rebuildOf(view);
let pending = false;

const listeners = new Set<() => void>();
const rebuildListeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;

function emit() {
  writeLocal(AUTOSAVE, state);
  view = effective(state);
  listeners.forEach((l) => l());
  // geometry rebuilds wait until the slider settles
  const next = rebuildOf(view);
  if (JSON.stringify(next) !== JSON.stringify(rebuild)) {
    pending = true;
    clearTimeout(timer);
    timer = setTimeout(() => {
      rebuild = next;
      pending = false;
      rebuildListeners.forEach((l) => l());
      listeners.forEach((l) => l());
    }, 350);
  }
}

// write into the active era: the base for Painterly, the era's own layer otherwise
function edit(fn: (layer: { v: Record<string, number>; colors: Colors }) => void) {
  if (era === 'painterly') {
    const next = { ...state, v: { ...state.v }, colors: { ...state.colors } };
    fn(next);
    state = next;
  } else {
    const cur = state.eras?.[era] ?? {};
    const layer = { v: { ...(cur.v ?? {}) }, colors: { ...(cur.colors ?? {}) } };
    fn(layer);
    state = { ...state, eras: { ...state.eras, [era]: layer } };
  }
  emit();
}

export const settings = {
  get: () => view,
  // what gets saved, exported and stored as presets: the base plus every era's own layer
  raw: () => state,
  era: () => era,
  setEra(next: EraId) {
    if (next === era) return;
    era = next;
    writeLocal(ERA, era);
    emit();
  },
  quality: () => quality,
  setQuality(next: QualityId) {
    if (next === quality) return;
    quality = next;
    writeLocal(QUALITY, quality);
    emit();
  },
  isRebuilding: () => pending,
  set(key: string, value: number) {
    edit((l) => { l.v[key] = value; });
  },
  setColor(palette: PaletteId, ramp: RampKey, i: number, hex: string, base: string[]) {
    const arr = [...(view.colors[palette]?.[ramp] ?? base)];
    arr[i] = hex;
    edit((l) => { l.colors[palette] = { ...l.colors[palette], [ramp]: arr }; });
  },
  setPaper(palette: PaletteId, hex: string) {
    edit((l) => { l.colors[palette] = { ...l.colors[palette], paper: hex }; });
  },
  replace(next: Partial<Settings>) {
    state = merge({ v: { ...DEFAULTS }, colors: {} }, next);
    emit();
  },
  resetToProject() {
    state = clone(project);
    emit();
  },
  resetToFactory() {
    state = { v: { ...DEFAULTS }, colors: {} };
    emit();
  },
  // project defaults ship with the build (public/settings.json); load once at startup
  async loadProject() {
    try {
      const res = await fetch('/settings.json', { cache: 'no-store' });
      if (!res.ok) return;
      project = merge({ v: { ...DEFAULTS }, colors: {} }, await res.json());
      state = merge(project, readLocal<Settings>(AUTOSAVE));
      emit();
    } catch {
      /* no project defaults yet */
    }
  },
  // named presets in this browser
  presets: (): Record<string, Settings> => readLocal<Record<string, Settings>>(PRESETS) ?? {},
  savePreset(name: string) {
    writeLocal(PRESETS, { ...settings.presets(), [name]: state });
    listeners.forEach((l) => l());
  },
  deletePreset(name: string) {
    const p = settings.presets();
    delete p[name];
    writeLocal(PRESETS, p);
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useSettings() {
  return useSyncExternalStore(settings.subscribe, settings.get);
}

export function useEra() {
  return useSyncExternalStore(settings.subscribe, settings.era);
}

export function useQuality() {
  return useSyncExternalStore(settings.subscribe, settings.quality);
}

// only changes when a geometry parameter settles — components rebuild on this
export function useRebuild() {
  return useSyncExternalStore(
    (l) => {
      rebuildListeners.add(l);
      return () => rebuildListeners.delete(l);
    },
    () => rebuild,
  );
}
