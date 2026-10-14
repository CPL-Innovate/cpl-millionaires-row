import gsap from 'gsap';
import * as THREE from 'three';
import { U, houseFx } from '../gl/uniforms';
import { sound, type PlayOpts } from '../audio/engine';
import { BUILDINGS, plateToWorld } from '../data/site';
import type { Caption, Panel, StopInfo, ThreadView } from './store';

// The toolkit every thread is choreographed with. A thread is one paused gsap timeline, built stop
// by stop; every piece of state it touches (camera, grade, houses, ambience levels, beds) is tweened
// on that timeline, so jumping to a stop or replaying lands in the right state. One-shot sounds are
// calls, skipped while seeking.

export type Vec3 = [number, number, number];
export type Scene = ThreadView['scene'];

// what the stage applies every frame
export const rig = {
  pos: new THREE.Vector3(),
  tgt: new THREE.Vector3(),
  fov: 50,
  duck: 1, // street ambience level (0 = a true silence)
  quiet: 0, // > 0.5: no carriages or crows
  music: 0, // background music under the thread (off unless a thread asks)
  street: 1, // sound mode: street (1) or map (0)
  dark: 0, // the frame fades toward black (Listen)
  beds: {} as Record<string, number>, // looping sounds by file → gain
  bedOpts: {} as Record<string, PlayOpts>,
  scene: 'street' as Scene,
  gen: 0, // bumped per thread, so the stage drops the last one's beds
};

// compass heading (degrees, 0 = north/−z, 90 = east/+x) → unit direction on the ground
export const heading = (deg: number): [number, number] => [Math.sin((deg * Math.PI) / 180), -Math.cos((deg * Math.PI) / 180)];

// where a house stands (world x, z) and how tall it is
export function house(id: string) {
  const b = BUILDINGS.find((x) => x.id === id)!;
  const [x, z] = plateToWorld(b.plate[0], b.plate[1]);
  return { x, z, h: b.size[1], w: b.size[0], d: b.size[2] };
}

const words = (s?: string) => (s ? s.split(/\s+/).filter(Boolean).length : 0);
export function readTime(p: Panel) {
  const n = words(p.text) + words(p.quote?.text) + words(p.footer) + (p.accounts ?? []).reduce((a, c) => a + words(c.claim) + words(c.who), 0) + (p.numbers?.length ?? 0) * 3;
  return 2.5 + n / 3.1; // a little under 200 words a minute, plus a beat to look
}

const HOUSES = [...BUILDINGS.map((b) => b.id), 'windmill'];

export class Kit {
  tl = gsap.timeline({ paused: true });
  readonly gen = ++rig.gen;
  stops: StopInfo[] = [];
  captions: Caption[] = [];
  endCard?: string;
  endScene: Scene = 'street';
  seeking = false;
  private t0 = 0;

  constructor(start: { pos: Vec3; tgt: Vec3; scene: Scene; reveal?: [number, number]; fov?: number }) {
    const tl = this.tl;
    rig.beds = {};
    rig.bedOpts = {};
    tl.set(rig.pos, { x: start.pos[0], y: start.pos[1], z: start.pos[2] }, 0)
      .set(rig.tgt, { x: start.tgt[0], y: start.tgt[1], z: start.tgt[2] }, 0)
      .set(rig, { fov: start.fov ?? 50, duck: 1, quiet: 0, music: 0, dark: 0, street: start.scene === 'street' ? 1 : 0, scene: start.scene }, 0)
      .set(U.uNight, { value: 0 }, 0)
      .set(U.uEvidence, { value: 0 }, 0);
    for (const id of HOUSES) {
      const f = houseFx(id);
      tl.set(f.uGone, { value: 0 }, 0).set(f.uGlow, { value: 0 }, 0).set(f.uFlicker, { value: 1 }, 0);
    }
    this.sceneAt(start.scene, 0, 0, start.reveal ?? [start.pos[0], start.pos[2]], true);
  }

  // street: the paint draws itself outward from `centre`; atlas: the ink drawing; plate: the flat
  // 1881 plate; paper: nothing but paper (a map overlay draws over it)
  sceneAt(name: Scene, at: number, dur: number, centre: [number, number] = [0, 0], first = false) {
    const tl = this.tl;
    tl.set(rig, { scene: name, street: name === 'street' ? 1 : 0 }, at);
    if (name === 'street') {
      tl.set(U.uRevealCenter.value, { x: centre[0], y: centre[1] }, at)
        .set(U.uStreet, { value: 1 }, at);
      if (first) tl.set(U.uRevealRadius, { value: 0 }, at);
      tl.to(U.uRevealRadius, { value: 650, duration: Math.max(dur, 4.5), ease: 'power1.in' }, at)
        .to(U.uAtlas, { value: 0, duration: Math.max(0.01, dur * 0.6), ease: 'power1.in' }, at);
    } else {
      tl.set(U.uRevealCenter.value, { x: centre[0], y: centre[1] }, at)
        .to(U.uRevealRadius, { value: 0, duration: Math.max(0.01, dur * 0.8), ease: 'power2.in' }, at)
        .to(U.uAtlas, { value: name === 'atlas' ? 1 : 0, duration: Math.max(0.01, dur), ease: 'power1.inOut' }, at)
        .set(U.uStreet, { value: 0 }, at + dur * 0.8);
    }
  }

  stop(title: string, panel: Panel, body: (s: Stop) => void, minLen = 0) {
    const s = new Stop(this, this.t0);
    this.stops.push({ title, at: this.t0, panel });
    this.tl.addLabel(`s${this.stops.length - 1}`, this.t0);
    body(s);
    this.t0 += Math.max(minLen, s.end, readTime(panel));
    this.tl.set({}, {}, this.t0);
  }

  finish(endCard: string, scene: Scene = 'street', tail = 1.5) {
    this.endCard = endCard;
    this.endScene = scene;
    this.t0 += tail;
    this.tl.set({}, {}, this.t0);
    return this;
  }

  get duration() { return this.t0; }
}

export class Stop {
  end = 0;
  private k: Kit;
  private t0: number;
  constructor(k: Kit, t0: number) { this.k = k; this.t0 = t0; }
  private mark(at: number, dur = 0) { this.end = Math.max(this.end, at + dur); return this.t0 + at; }

  // camera
  shot(pos: Vec3, tgt: Vec3, dur: number, at = 0, ease = 'power2.inOut') {
    const t = this.mark(at, dur);
    this.k.tl.to(rig.pos, { x: pos[0], y: pos[1], z: pos[2], duration: dur, ease }, t)
      .to(rig.tgt, { x: tgt[0], y: tgt[1], z: tgt[2], duration: dur, ease }, t);
    return this;
  }
  cut(pos: Vec3, tgt: Vec3, at = 0) {
    const t = this.mark(at);
    this.k.tl.set(rig.pos, { x: pos[0], y: pos[1], z: pos[2] }, t).set(rig.tgt, { x: tgt[0], y: tgt[1], z: tgt[2] }, t);
    return this;
  }
  // stand at `pos` and turn: compass heading h0 → h1 (degrees), looking `dist` away at height `ty`
  turn(pos: Vec3, h0: number, h1: number, dur: number, at = 0, o: { dist?: number; ty?: number; ease?: string } = {}) {
    const t = this.mark(at, dur);
    const p = { h: h0 };
    const apply = () => {
      const [dx, dz] = heading(p.h), d = o.dist ?? 30;
      rig.pos.set(...pos);
      rig.tgt.set(pos[0] + dx * d, o.ty ?? pos[1] + 2, pos[2] + dz * d);
    };
    this.k.tl.fromTo(p, { h: h0 }, { h: h1, duration: dur, ease: o.ease ?? 'sine.inOut', onUpdate: apply, onStart: apply }, t);
    return this;
  }
  fov(v: number, dur: number, at = 0) { this.k.tl.to(rig, { fov: v, duration: dur, ease: 'power1.inOut' }, this.mark(at, dur)); return this; }

  // scene
  scene(name: Scene, dur: number, at = 0, centre?: [number, number]) {
    this.k.sceneAt(name, this.mark(at, dur), dur, centre);
    return this;
  }
  night(v: number, dur: number, at = 0) { this.k.tl.to(U.uNight, { value: v, duration: dur, ease: 'power1.inOut' }, this.mark(at, dur)); return this; }
  evidence(v: number, dur: number, at = 0) { this.k.tl.to(U.uEvidence, { value: v, duration: dur, ease: 'power1.inOut' }, this.mark(at, dur)); return this; }
  gone(id: string, v: number, dur: number, at = 0, ease = 'power1.inOut') {
    this.k.tl.to(houseFx(id).uGone, { value: v, duration: dur, ease }, this.mark(at, dur));
    return this;
  }
  glow(id: string, v: number, dur: number, at = 0, o: { flicker?: number } = {}) {
    const t = this.mark(at, dur), f = houseFx(id);
    if (o.flicker !== undefined) this.k.tl.set(f.uFlicker, { value: o.flicker }, t);
    this.k.tl.to(f.uGlow, { value: v, duration: dur, ease: 'power1.inOut' }, t);
    return this;
  }
  tween(target: object, vars: gsap.TweenVars, at = 0) {
    this.k.tl.to(target, vars, this.mark(at, Number(vars.duration ?? 0)));
    return this;
  }
  call(fn: () => void, at = 0) { this.k.tl.call(fn, [], this.mark(at)); return this; }

  // sound
  sound(name: string, opts: PlayOpts = {}, at = 0) {
    this.k.tl.call(() => { if (!this.k.seeking) sound.play(name, { ...opts, thread: true }); }, [], this.mark(at));
    return this;
  }
  drone(freq: number, gain: number, secs: number, at = 0) {
    this.k.tl.call(() => { if (!this.k.seeking) sound.drone(freq, gain, secs); }, [], this.mark(at));
    return this;
  }
  bed(name: string, gain: number, dur: number, at = 0, opts: PlayOpts = {}) {
    if (!(name in rig.beds)) { rig.beds[name] = 0; this.k.tl.set(rig.beds, { [name]: 0 }, 0); }
    rig.bedOpts[name] = opts;
    this.k.tl.to(rig.beds, { [name]: gain, duration: Math.max(0.01, dur), ease: 'power1.inOut' }, this.mark(at, dur));
    return this;
  }
  duck(level: number, dur: number, at = 0) { this.k.tl.to(rig, { duck: level, duration: Math.max(0.01, dur), ease: 'power1.inOut' }, this.mark(at, dur)); return this; }
  quiet(on: boolean, at = 0) { this.k.tl.set(rig, { quiet: on ? 1 : 0 }, this.mark(at)); return this; }
  music(level: number, dur: number, at = 0) { this.k.tl.to(rig, { music: level, duration: Math.max(0.01, dur) }, this.mark(at, dur)); return this; }
  dark(v: number, dur: number, at = 0) { this.k.tl.to(rig, { dark: v, duration: Math.max(0.01, dur), ease: 'power1.inOut' }, this.mark(at, dur)); return this; }
  caption(text: string, at = 0, dur = 4) { this.k.captions.push({ at: this.mark(at, dur), dur, text }); return this; }
  hold(len: number) { this.end = Math.max(this.end, len); return this; }
}
