// The sound of the street. One Web Audio graph: beds (looping ambience), positional sounds placed
// in the 3D scene (windmill, gas lamps, carriages, crows), footsteps and interface sounds. Sounds
// come from ElevenLabs (scripts/gen-sounds.mjs), levelled to −20 LUFS (scripts/normalize-audio.py);
// the mix lives here. Nothing loads or plays until the visitor turns sound on.

type Vec3 = [number, number, number];

// footstep onsets (s) in each take, found by energy detection; each slice plays as one step
const STEPS: Record<string, number[]> = {
  flagstone: [0.1, 0.46, 0.79, 1.21, 1.62, 2.03, 2.38, 2.89, 3.52, 4.29, 5.04, 5.58, 6.2, 6.71, 7.35],
  dirt: [0.42, 1.51, 1.8, 2.35, 3.18, 3.53, 4.03, 4.62, 4.91, 5.64, 6.49, 7.36],
  lawn: [0.26, 0.56, 1.03, 1.89, 2.57, 3.03, 3.53, 3.81, 4.09, 4.52, 4.82, 5.1, 6.09, 6.42],
};
export type Surface = keyof typeof STEPS;

const BEDS = { street: 0.5, wind: 0.42, city: 0.16, map: 0.35 };

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

class SoundEngine {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private bedBus!: GainNode; // ducked at St. Paul's
  private buffers = new Map<string, Promise<AudioBuffer>>();
  private beds = new Map<string, GainNode>();
  private windmill: PannerNode | null = null;
  private lamp: PannerNode | null = null;
  private on = false;
  private era: 'painterly' | '1888' = 'painterly';
  private mode: 'map' | 'street' = 'map';
  private timers: number[] = [];
  log: string[] = []; // dev: what played, for checking without ears

  get enabled() {
    return this.on;
  }

  // must be called from a user gesture the first time (browser autoplay rules)
  async enable() {
    this.on = true;
    if (!this.ctx) this.build();
    await this.ctx!.resume();
    this.fade(this.master, 1, 0.8);
    this.startBeds();
    this.schedule();
  }

  disable() {
    this.on = false;
    this.timers.forEach(clearTimeout);
    this.timers = [];
    if (!this.ctx) return;
    this.fade(this.master, 0, 0.4);
    const ctx = this.ctx;
    setTimeout(() => { if (!this.on) ctx.suspend(); }, 500);
  }

  private build() {
    const ctx = new AudioContext();
    this.ctx = ctx;
    // a gentle safety compressor on the master: positional sounds can stack up
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10;
    comp.ratio.value = 4;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(comp).connect(ctx.destination);
    this.bedBus = ctx.createGain();
    this.bedBus.connect(this.master);
  }

  private load(name: string) {
    let p = this.buffers.get(name);
    if (!p) {
      p = fetch(`/audio/${name}.mp3`)
        .then((r) => r.arrayBuffer())
        .then((b) => this.ctx!.decodeAudioData(b));
      this.buffers.set(name, p);
    }
    return p;
  }

  // A loop made seamless at load: the last `xf` seconds crossfade (equal power) into the start,
  // which also hides MP3 encoder padding at the seam.
  private async loopBuffer(name: string) {
    const src = await this.load(name);
    const ctx = this.ctx!;
    const xf = Math.min(1.5, src.duration / 4);
    const n = Math.floor(xf * src.sampleRate);
    const len = src.length - n;
    const out = ctx.createBuffer(src.numberOfChannels, len, src.sampleRate);
    for (let c = 0; c < src.numberOfChannels; c++) {
      const a = src.getChannelData(c), o = out.getChannelData(c);
      o.set(a.subarray(n, src.length));
      for (let j = 0; j < n; j++) {
        const t = j / n;
        o[len - n + j] = a[src.length - n + j] * Math.cos((t * Math.PI) / 2) + a[j] * Math.sin((t * Math.PI) / 2);
      }
    }
    return out;
  }

  private async startLoop(name: string, dest: AudioNode, gain: number) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.connect(dest);
    const s = ctx.createBufferSource();
    s.buffer = await this.loopBuffer(name);
    s.loop = true;
    s.connect(g);
    s.start(ctx.currentTime, Math.random() * s.buffer.duration); // start anywhere in the loop
    this.fade(g, gain, 2);
    return g;
  }

  private fade(g: GainNode, to: number, secs: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.linearRampToValueAtTime(to, t + secs);
  }

  private async startBeds() {
    if (this.beds.size) return this.mixBeds();
    const want: [string, string][] = [
      ['street', 'amb-street'], ['city', 'city-far'], ['map', 'amb-map'],
      ['wind-1888', 'amb-wind-bare'], ['wind-painterly', 'amb-wind-leafy'],
    ];
    for (const [key, file] of want) this.beds.set(key, await this.startLoop(file, this.bedBus, 0));
    // the windmill and the nearest gas lamp live in the scene
    this.windmill = this.panner(25, 1.1);
    await this.startLoop('windmill', this.windmill, 1);
    this.lamp = this.panner(1.5, 2.2);
    await this.startLoop('gaslamp', this.lamp, 0.5);
    this.mixBeds();
  }

  private mixBeds() {
    if (!this.on || !this.beds.size) return;
    const street = this.mode === 'street';
    const set = (k: string, v: number) => { const g = this.beds.get(k); if (g) this.fade(g, v, 2.5); };
    set('street', street ? BEDS.street : BEDS.street * 0.15);
    set('city', street ? BEDS.city : 0);
    set('map', street ? 0 : BEDS.map);
    set('wind-1888', street && this.era === '1888' ? BEDS.wind : 0);
    set('wind-painterly', street && this.era === 'painterly' ? BEDS.wind : 0);
  }

  private panner(ref: number, rolloff: number) {
    const p = this.ctx!.createPanner();
    p.panningModel = 'equalpower';
    p.distanceModel = 'inverse';
    p.refDistance = ref;
    p.rolloffFactor = rolloff;
    p.connect(this.master);
    return p;
  }

  private setPos(p: PannerNode, [x, y, z]: Vec3) {
    const t = this.ctx!.currentTime;
    p.positionX.setTargetAtTime(x, t, 0.05);
    p.positionY.setTargetAtTime(y, t, 0.05);
    p.positionZ.setTargetAtTime(z, t, 0.05);
  }

  // one-shot; `at` places it in the scene, otherwise it plays flat (interface sounds)
  async play(name: string, opts: { gain?: number; at?: Vec3; rate?: number; delay?: number; offset?: number; dur?: number; ref?: number } = {}) {
    if (!this.on || !this.ctx) return;
    const ctx = this.ctx;
    if (import.meta.env.DEV) this.log.push(name);
    const buf = await this.load(name);
    const s = ctx.createBufferSource();
    s.buffer = buf;
    s.playbackRate.value = opts.rate ?? 1;
    const g = ctx.createGain();
    g.gain.value = opts.gain ?? 1;
    s.connect(g);
    let p: PannerNode | null = null;
    if (opts.at) {
      p = this.panner(opts.ref ?? 6, 1);
      p.positionX.value = opts.at[0]; p.positionY.value = opts.at[1]; p.positionZ.value = opts.at[2];
      g.connect(p);
    } else g.connect(this.master);
    const when = ctx.currentTime + (opts.delay ?? 0);
    if (opts.dur) {
      // a slice: short fades so it doesn't click
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(opts.gain ?? 1, when + 0.006);
      g.gain.setValueAtTime(opts.gain ?? 1, when + opts.dur - 0.04);
      g.gain.linearRampToValueAtTime(0, when + opts.dur);
      s.start(when, opts.offset ?? 0, opts.dur);
    } else s.start(when, opts.offset ?? 0);
    s.onended = () => { g.disconnect(); p?.disconnect(); };
    return { source: s, panner: p };
  }

  // ---------------------------------------------------------------- scene hooks

  setMode(mode: 'map' | 'street') {
    this.mode = mode;
    this.mixBeds();
  }

  setEra(era: 'painterly' | '1888') {
    this.era = era;
    this.mixBeds();
  }

  // camera → listener, every frame
  setListener(pos: Vec3, fwd: Vec3) {
    if (!this.on || !this.ctx) return;
    const l = this.ctx.listener, t = this.ctx.currentTime;
    l.positionX.setTargetAtTime(pos[0], t, 0.03);
    l.positionY.setTargetAtTime(pos[1], t, 0.03);
    l.positionZ.setTargetAtTime(pos[2], t, 0.03);
    l.forwardX.setTargetAtTime(fwd[0], t, 0.03);
    l.forwardY.setTargetAtTime(fwd[1], t, 0.03);
    l.forwardZ.setTargetAtTime(fwd[2], t, 0.03);
    l.upX.value = 0; l.upY.value = 1; l.upZ.value = 0;
  }

  placeWindmill(pos: Vec3) { if (this.windmill) this.setPos(this.windmill, pos); }
  placeLamp(pos: Vec3) { if (this.lamp) this.setPos(this.lamp, pos); }

  step(surface: Surface, hurry: boolean) {
    const on = STEPS[surface];
    const i = Math.floor(Math.random() * (on.length - 1));
    const dur = Math.min(0.42, on[i + 1] - on[i]);
    this.play(`step-${surface}`, { gain: hurry ? 0.5 : 0.4, offset: Math.max(0, on[i] - 0.02), dur, rate: 0.94 + Math.random() * 0.12 });
  }

  // a carriage trots past along Euclid: the panner travels the street while the take plays, timed so
  // the loudest moment (mid-take) is the closest approach
  async carriage(listenerX: number) {
    const dir = Math.random() < 0.5 ? 1 : -1;
    const z = (Math.random() < 0.5 ? -1 : 1) * (2.5 + Math.random() * 3);
    const r = await this.play(pick(['carriage-pass-1', 'carriage-pass-2']), { gain: 0.75, at: [listenerX - dir * 45, 1.2, z], ref: 8 });
    if (!r?.panner || !this.ctx) return;
    const t = this.ctx.currentTime;
    r.panner.positionX.setValueAtTime(listenerX - dir * 45, t);
    r.panner.positionX.linearRampToValueAtTime(listenerX + dir * 45, t + 14);
    if (Math.random() < 0.35) this.play(pick(['horse-snort-1', 'horse-snort-2']), { gain: 0.5, at: [listenerX - dir * 8, 1.6, z], delay: 5.5, ref: 5 });
  }

  // ---------------------------------------------------------------- ambient events

  private listenerX = 0;
  private listenerZ = 0;
  noteListener(x: number, z: number) { this.listenerX = x; this.listenerZ = z; }

  private schedule() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    const every = (min: number, max: number, fn: () => void) => {
      const tick = () => {
        this.timers.push(window.setTimeout(() => { if (this.on) { fn(); tick(); } }, (min + Math.random() * (max - min)) * 1000));
      };
      tick();
    };
    every(18, 45, () => { if (this.mode === 'street') this.carriage(this.listenerX); });
    // crows in the bare trees: more of them in 1888
    every(14, 40, () => {
      if (this.mode !== 'street' || (this.era === 'painterly' && Math.random() < 0.6)) return;
      const a = Math.random() * Math.PI * 2, d = 20 + Math.random() * 40;
      this.play(pick(['crows-1', 'crows-2']), { gain: 0.45, at: [this.listenerX + Math.cos(a) * d, 14, this.listenerZ + Math.sin(a) * d], ref: 12 });
    });
  }

  // ---------------------------------------------------------------- story

  // St. Paul's agreed to still its bells: at that station the street falls away and a bell answers
  // from far across the city
  private ducked = false;
  silentBells(on: boolean) {
    if (!this.ctx || on === this.ducked) return;
    this.ducked = on;
    this.fade(this.bedBus, on ? 0.12 : 1, on ? 2.5 : 3);
    if (on) this.play('bell-far', { gain: 0.8, delay: 2.5 });
  }

  beat(id: string) {
    if (id === 'misfire') {
      this.play('misfire', { gain: 0.8 });
      this.play('streetcar-bell', { gain: 0.6, delay: 2.4 });
    } else if (id === 'fence') this.play('gate-iron', { gain: 0.8 });
    else if (id === 'logs') this.play('greased-logs', { gain: 0.8 });
    // 'bells' is handled by silentBells(), which the app drives from the station and the open beat
  }

  ui(name: 'tap' | 'paper' | 'sketch' | 'gather' | 'photo' | 'wash' | 'erase', delay = 0) {
    const gain = { tap: 0.3, paper: 0.5, sketch: 0.4, gather: 0.4, photo: 0.4, wash: 0.4, erase: 0.25 }[name];
    this.play(name === 'tap' ? pick(['ui-tap-1', 'ui-tap-2', 'ui-tap-3']) : `ui-${name}`, { gain, delay });
  }
}

export const sound = new SoundEngine();

if (import.meta.env.DEV) (window as unknown as { __sound: SoundEngine }).__sound = sound;
