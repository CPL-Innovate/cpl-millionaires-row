import { resetHouseFx, U } from '../gl/uniforms';
import { sound } from '../audio/engine';
import { rig, type Kit, type Scene } from './kit';
import { threadStore } from './store';
import { THREADS } from './index';
import { avenueReset } from './avenue';

// Starts, steers and leaves a thread. The App hands the scene back to the walker or the map on exit.
export const threadState = { active: false };

let kit: Kit | null = null;

export const player = {
  onExit: (_scene: Scene) => {},
  get kit() { return kit; },

  start(id: string, o: { stop?: number; hold?: boolean; at?: number } = {}) {
    const def = THREADS.find((t) => t.id === id);
    if (!def) return;
    this.kill();
    sound.threadReset();
    const k = def.build();
    kit = k;
    threadState.active = true;
    threadStore.set({ id, title: def.label, stops: k.stops, stop: 0, captions: [], playing: !o.hold, ended: false, endCard: k.endCard, time: 0, duration: k.duration, scene: rig.scene, dark: 0 });
    k.tl.eventCallback('onComplete', () => threadStore.set({ ended: true, playing: false }));
    if (o.stop) this.seekStop(o.stop);
    if (o.at) this.seekTime(k.tl.time() + o.at);
    if (o.hold) { k.tl.pause(); this.sync(); } else k.tl.play();
  },

  // the stage calls this every frame: which stop, which captions
  sync() {
    if (!kit) return;
    const t = kit.tl.time();
    let stop = 0;
    kit.stops.forEach((s, i) => { if (t >= s.at - 1e-3) stop = i; });
    const captions = kit.captions.filter((c) => t >= c.at && t < c.at + c.dur).map((c) => c.text);
    threadStore.set({ stop, captions, time: Math.round(t * 4) / 4, scene: rig.scene, dark: Math.round(rig.dark * 50) / 50 });
  },

  seekStop(i: number) {
    if (!kit) return;
    const n = Math.max(0, Math.min(kit.stops.length - 1, i));
    sound.threadReset(); // cut what the previous stop was playing; the beds come back via the rig
    kit.seeking = true;
    kit.tl.seek(`s${n}`, false);
    kit.seeking = false;
    threadStore.set({ ended: false });
    this.sync();
  },
  seekTime(t: number) {
    if (!kit) return;
    kit.seeking = true;
    kit.tl.seek(t, false);
    kit.seeking = false;
    this.sync();
  },
  next() { const v = threadStore.get(); if (v.stop < v.stops.length - 1) this.seekStop(v.stop + 1); else kit?.tl.progress(1); },
  prev() { const v = threadStore.get(); const back = kit && kit.tl.time() - kit.stops[v.stop].at < 1.5 ? v.stop - 1 : v.stop; this.seekStop(back); },
  toggle() {
    if (!kit) return;
    const v = threadStore.get();
    if (v.ended) return this.replay();
    if (kit.tl.paused()) kit.tl.play(); else kit.tl.pause();
    threadStore.set({ playing: !kit.tl.paused() });
  },
  pause() { kit?.tl.pause(); threadStore.set({ playing: false }); },
  replay() { this.seekStop(0); kit?.tl.play(); threadStore.set({ playing: true, ended: false }); },

  exit() {
    const scene: Scene = rig.scene === 'street' ? 'street' : 'atlas'; // hand over whatever is on screen
    this.kill();
    this.onExit(scene);
  },

  kill() {
    if (!kit) return;
    kit.tl.kill();
    kit = null;
    threadState.active = false;
    resetHouseFx();
    U.uNight.value = 0;
    U.uEvidence.value = 0;
    rig.dark = 0;
    avenueReset();
    sound.threadReset();
    threadStore.reset();
  },
};

if (import.meta.env.DEV) Object.assign(window, { __thread: player, __rig: rig });
