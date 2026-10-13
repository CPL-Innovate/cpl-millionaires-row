import { useSyncExternalStore } from 'react';
import type { PaletteId } from '../palettes';
import { DEFAULTS, REBUILD_KEYS, type RampKey } from './schema';

// Settings = numeric parameters + per-palette colour overrides. Precedence on load:
// schema defaults < project defaults (public/settings.json) < this browser's autosave.

export interface PaletteOverride {
  paper?: string;
  foliage?: string[];
  earth?: string[];
}
export interface Settings {
  v: Record<string, number>;
  colors: Partial<Record<PaletteId, PaletteOverride>>;
}

const AUTOSAVE = 'mr-settings-v1';
const PRESETS = 'mr-presets-v1';

const clone = (s: Settings): Settings => JSON.parse(JSON.stringify(s));
const merge = (base: Settings, over?: Partial<Settings> | null): Settings => ({
  v: { ...base.v, ...(over?.v ?? {}) },
  colors: { ...base.colors, ...(over?.colors ?? {}) },
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

let project: Settings = { v: { ...DEFAULTS }, colors: {} };
let state: Settings = merge(project, readLocal<Settings>(AUTOSAVE));
const rebuildOf = (s: Settings) => Object.fromEntries(REBUILD_KEYS.map((k) => [k, s.v[k]]));
let rebuild: Record<string, number> = rebuildOf(state);
let pending = false;

const listeners = new Set<() => void>();
const rebuildListeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;

function emit() {
  writeLocal(AUTOSAVE, state);
  listeners.forEach((l) => l());
  // geometry rebuilds wait until the slider settles
  const next = rebuildOf(state);
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

export const settings = {
  get: () => state,
  isRebuilding: () => pending,
  set(key: string, value: number) {
    state = { ...state, v: { ...state.v, [key]: value } };
    emit();
  },
  setColor(palette: PaletteId, ramp: RampKey, i: number, hex: string, base: string[]) {
    const cur = state.colors[palette] ?? {};
    const arr = [...(cur[ramp] ?? base)];
    arr[i] = hex;
    state = { ...state, colors: { ...state.colors, [palette]: { ...cur, [ramp]: arr } } };
    emit();
  },
  setPaper(palette: PaletteId, hex: string) {
    const cur = state.colors[palette] ?? {};
    state = { ...state, colors: { ...state.colors, [palette]: { ...cur, paper: hex } } };
    emit();
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
