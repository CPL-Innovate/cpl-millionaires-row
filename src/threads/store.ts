import { useSyncExternalStore } from 'react';

// Threads: short animated chapters a visitor picks from a menu (content/2026-10-14-threads-scripts).
// Each thread is choreographed by hand (its own file); this is only the shared state the player UI
// and the scene read.

export interface Archive {
  label: string; // what it is
  id?: string; // CPL ContentDM pointer, or a book figure
  img?: string; // local image, when the build has it
  credit?: string;
}
export interface Account { claim: string; who: string } // one of several versions of a story
export interface Panel {
  text?: string;
  quote?: { text: string; who: string }; // a sourced quote, set apart
  accounts?: Account[]; // cards side by side (The Silent Bells, stop 3)
  numbers?: { value: string; label: string }[]; // big type (Vanished, stop 5)
  footer?: string;
  archive?: Archive[];
  spoken?: boolean; // Listen: the panel is narration; text kept small
}
export interface StopInfo { title: string; at: number; panel: Panel }
export interface Caption { at: number; dur: number; text: string }

export interface ThreadView {
  id: string | null;
  title: string;
  stops: StopInfo[];
  stop: number;
  captions: string[]; // sound captions showing now
  playing: boolean;
  ended: boolean;
  endCard?: string;
  time: number;
  duration: number;
  scene: 'street' | 'atlas' | 'plate' | 'paper';
  dark: number; // how dark the frame is (Listen), 0–1
}

const idle: ThreadView = { id: null, title: '', stops: [], stop: 0, captions: [], playing: false, ended: false, time: 0, duration: 0, scene: 'street', dark: 0 };
let view = idle;
const subs = new Set<() => void>();

export const threadStore = {
  get: () => view,
  set(patch: Partial<ThreadView>) {
    let changed = false;
    for (const k in patch) {
      const a = (patch as Record<string, unknown>)[k], b = (view as unknown as Record<string, unknown>)[k];
      if (Array.isArray(a) && Array.isArray(b) ? a.length !== b.length || a.some((x, i) => x !== b[i]) : a !== b) { changed = true; break; }
    }
    if (!changed) return;
    view = { ...view, ...patch };
    subs.forEach((f) => f());
  },
  reset() { view = idle; subs.forEach((f) => f()); },
  subscribe(f: () => void) { subs.add(f); return () => { subs.delete(f); }; },
};

export const useThread = () => useSyncExternalStore(threadStore.subscribe, threadStore.get);
