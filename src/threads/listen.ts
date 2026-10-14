import { Kit, type Stop } from './kit';

// 10 · Listen: what did this corner sound like, and how do we know? The screen fades almost to
// black over the 1888 corner; the panels are spoken (scripts/voice.json → listen-*.mp3) with the
// text kept small, and sound captions run throughout. Script: threads-scripts §10.
// Flags carried: the Blue Danube anecdote is Wilson's and isn't tied to the 3730 party, so the
// copy keeps them as two facts; the housewarming is undated; Wilson's words need rights clearance
// before they're voiced (listen-5 voices them: a draft); "today's traffic" is a generated stand-in
// until a real recording is made at the corner. The waltz is a generated Viennese-style waltz,
// not the Blue Danube (the music model refuses named pieces). The 3730 window glow is drawn on
// the nearest modelled south-side house (Rockefeller's): in near-black it reads only as "a window".

export function listen() {
  const k = new Kit({ pos: [0, 1.7, -7], tgt: [-30, 4, -6], scene: 'street', reveal: [0, -7] });
  const voice = (s: Stop, name: string, at: number) => s.sound(name, { gain: 1.1 }, at);

  k.stop('Close your eyes', {
    spoken: true,
    text: 'Close your eyes, or don’t. This is Euclid Avenue at E. 40th, October 1888.',
    footer: 'Headphones recommended.',
  }, (s) => {
    s.dark(0.9, 4, 0)
      .quiet(true, 0)
      .duck(0, 1, 0)
      .bed('amb-wind-bare', 0.55, 3, 0)
      .caption('[wind through near-bare elms, leaves on the lawns]', 1, 6);
    voice(s, 'listen-1', 1.5);
    s.sound('crows-1', { gain: 0.5, pan: -0.5 }, 7.5).caption('[a crow]', 7.6, 2.5);
  }, 11);

  k.stop('Hooves on stone', {
    spoken: true,
    text: 'The street was paved in Medina sandstone blocks in 1873. People who lived here remembered the sound of hooves on it and carriages going by at night.',
  }, (s) => {
    s.sound('hoof-stone', { gain: 0.75 }, 0.5).caption('[a single carriage, west to east: iron tyres on stone]', 1, 9);
    voice(s, 'listen-2', 2.5);
  }, 15);

  k.stop('Where the noise stopped', {
    spoken: true,
    text: 'Listen east. The horsecars came up from Prospect and turned back onto Euclid right about here. West of this corner, no streetcars were allowed.',
  }, (s) => {
    // a faint glow to the east
    s.turn([0, 1.7, -7], 270, 90, 5, 0, { dist: 40, ty: 3 })
      .dark(0.82, 3, 0);
    voice(s, 'listen-3', 0.5);
    s.sound('streetcar-bell', { gain: 0.35, pan: 0.85, lowpass: 1600 }, 6)
      .sound('carriage-pass-2', { gain: 0.15, pan: 0.85, lowpass: 900, offset: 4, dur: 6 }, 6.5)
      .sound('streetcar-bell', { gain: 0.25, pan: 0.9, lowpass: 1200 }, 10)
      .caption('[a horsecar bell and harness, far off to the east]', 6, 6);
  }, 14);

  k.stop('The silence', {
    spoken: true,
    text: 'That church tower has bells. What you’re hearing is them not ringing. They stayed silent while the old man across the street was alive.',
  }, (s) => {
    // the outline of St. Paul's tower, barely there; then four seconds of nothing, even the wind
    s.shot([8, 1.2, -12], [15.8, 19, 17.7], 4, 0)
      .dark(0.84, 2, 0);
    voice(s, 'listen-4', 0.5);
    s.bed('amb-wind-bare', 0, 0.4, 9.2)
      .caption('[silence]', 9.6, 4)
      .hold(14);
  }, 14);

  k.stop('A waltz through glass', {
    spoken: true,
    text: 'On the south side, at 3730, the Germania Orchestra played for nearly six hundred guests. A florist who danced to it remembered a young man crossing the floor: “This is our waltz.”',
  }, (s) => {
    s.bed('amb-wind-bare', 0.45, 2, 0)
      .night(1, 0.01, 0)
      .shot([-30, 1.6, 20], [-60, 6, 62], 3, 0)
      .glow('rockefeller', 1, 3, 0.5, { flicker: 1 })
      .dark(0.8, 2, 0)
      .bed('waltz-glass', 0.4, 2.5, 0.5, { lowpass: 900 })
      .caption('[a waltz, muffled, as if through a window from the sidewalk]', 1, 6);
    voice(s, 'listen-5', 2);
    s.bed('waltz-glass', 0, 2.5, 14);
  }, 16);

  k.stop('Sunday morning', {
    spoken: true,
    text: 'Sunday at St. Paul’s: prancing horses, liveried coachmen, the girls from the Mittleberger School. On Easter, latecomers were turned away at the door.',
  }, (s) => {
    // brighter, morning
    s.glow('rockefeller', 0, 1.5, 0)
      .night(0, 2, 0)
      .dark(0.7, 3, 0)
      .shot([-1, 1.6, -14], [25, 10, 31], 3, 0)
      .sound('crowd-sunday', { gain: 0.6 }, 0.5)
      .caption('[a gathering crowd, carriage doors, horses stamping; still no bells]', 1, 8);
    voice(s, 'listen-6', 2.5);
  }, 15);

  k.stop('The wheel no one described', {
    spoken: true,
    text: 'Behind the Brush house, a wheel fifty-six feet across turned all day. Nobody wrote down what it sounded like. So we’ve left it silent.',
  }, (s) => {
    // the faint shape of the windmill above the roofs; nothing added to the mix
    s.cut([-218, 1.7, -9.6], [-212, 16, -112], 0)
      .fov(44, 0.01, 0)
      .dark(0.78, 1, 0);
    voice(s, 'listen-7', 0.8);
    s.caption('[nothing added: a deliberate gap in the mix]', 6, 4);
  }, 11);

  k.stop('Fast-forward, by ear', {
    spoken: true,
    text: '1890… 1915… 1952… today.',
    footer: 'Wilson’s old radio station made rain by pouring sand through a tea strainer. Most of what you just heard is our best guess. The silence wasn’t.',
  }, (s) => {
    s.fov(50, 0.01, 0)
      .cut([0, 1.7, -7], [-30, 4, -6], 0)
      .dark(0.92, 1.5, 0)
      .bed('amb-wind-bare', 0.2, 2, 0);
    voice(s, 'listen-8a', 0.5);
    s.bed('bells-peal', 0.55, 0.8, 1.6).bed('bells-peal', 0, 1.2, 4.6).caption('[1890: the bells return]', 1.6, 3.4);
    voice(s, 'listen-8b', 5.4);
    s.sound('streetcar-rails', { gain: 0.6 }, 6.2).caption('[1915: streetcar wheels on rails, down Euclid]', 6.2, 4);
    voice(s, 'listen-8c', 10.4);
    s.sound('crowd-arena', { gain: 0.45, offset: 0.5, dur: 4.5 }, 11).caption('[1952: a roar from the Arena on the Brush site]', 11, 4);
    voice(s, 'listen-8d', 15.6);
    s.bed('traffic-today', 0.45, 1.5, 16.2).caption('[today: traffic on Euclid]', 16.4, 5)
      .bed('traffic-today', 0.15, 3, 21);
    s.sound('listen-9', { gain: 1.1 }, 22.5);
    s.bed('traffic-today', 0, 2, 32).bed('amb-wind-bare', 0, 2, 32)
      .dark(0.35, 3, 31); // the corner comes back up for the walk
  }, 34);

  return k.finish('Go stand at E. 40th and Euclid. Listen.', 'street', 2);
}
