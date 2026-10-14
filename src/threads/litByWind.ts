import { Kit, house } from './kit';

// 4 · Lit by Wind: what was that giant wheel behind Mr. Brush's house? Street level at 3725 (north
// side), the windmill above the outbuildings. Script: threads-scripts §4.
// Flags carried: Brush's build date has two accounts (1880–84 vs 1887), so it stays off screen;
// "within a few years his lights were going up in city streets" is general knowledge (Public
// Square 1879), to check with L&GH; the Ford doorknob is lore ("the story goes"); windmill gone
// "by 1912" (the 1910 date and the 80,000 lb weight don't agree). No source describes the
// windmill's sound: the street's windmill loop is kept very soft.

const ELECTRIC: [number, number, number] = [1.0, 0.94, 0.8];
const GAS: [number, number, number] = [1.0, 0.7, 0.32];

export function litByWind() {
  const b = house('brush');
  const rotor: [number, number, number] = [b.x - 22, 19, b.z - 29]; // the wheel's hub (World.tsx: tower at bx−22, bz−30)
  // west of the house on the north sidewalk: the wheel shows above the roofs beside it
  const STREET: [number, number, number] = [-218, 1.7, -9.6];
  const LOOK: [number, number, number] = [-212, 16, -112];
  const k = new Kit({ pos: [-222, 1.7, -5], tgt: LOOK, scene: 'street', reveal: [-218, -9.6], fov: 44 });

  k.stop('The one thing moving', {
    text: 'Look past the house. That’s the only thing moving on the whole block.',
  }, (s) => {
    // dusk, and hold
    s.night(0.28, 4, 0)
      .duck(0.35, 2, 0)
      .shot(STREET, LOOK, 9, 0, 'sine.inOut')
      .caption('[the street at dusk; the wheel makes no sound we know of]', 2, 5);
  }, 10);

  k.stop('Too bright for the horses', {
    text: '1877. Charles Brush tested his arc light in public. It spooked the parade horses, and a policeman made him switch it off. Within a few years his lights were going up in city streets.',
    archive: [{ label: 'Charles F. Brush, young', id: 'Dutka, Misfortune (2015) ch. 15 fig. 1, Plain Dealer (permission)' }],
  }, (s) => {
    // an archival beat: the street stays dim behind it
    s.night(0.5, 2.5, 0).evidence(0.5, 2.5, 0);
  }, 10);

  k.stop('“Passing along Euclid Avenue…”', {
    quote: { text: 'Passing along Euclid Avenue… may be seen, mounted high on a tower, the immense wheel.', who: 'Scientific American, 20 December 1890' },
    text: 'Fifty-six feet across. 144 blades. A sixty-foot tower. Ten tons of batteries in the cellar.',
    archive: [
      { label: 'Scientific American cover engraving, 20 Dec 1890 (public domain)', id: 'Sci. Am. 63:25, p. 389' },
      { label: 'The windmill', id: 'Dutka, Misfortune (2015) ch. 15 fig. 4, CSU' },
    ],
  }, (s) => {
    // crane up and over the outbuildings until the wheel fills the frame; above the roofline only
    // (the rear yard isn't photographed)
    s.night(0.12, 3, 0).evidence(0, 2, 0)
      .fov(50, 2, 0)
      .shot([-210, 12, -38], [rotor[0], rotor[1], rotor[2]], 5, 0, 'power2.in')
      .shot([rotor[0] + 6, 24, rotor[2] + 42], rotor, 7, 5, 'power2.out')
      .fov(42, 7, 5);
  }, 16);

  k.stop('The house glows', {
    text: '1888. While the neighbours burned gas, the Brush house lit itself: about a hundred of its 350 bulbs on any given night. The neighbours were amazed, and mostly annoyed.',
  }, (s) => {
    // back to the street; night falls; Brush's light is even, the neighbours' gas flickers
    s.fov(55, 4, 0)
      .shot([-168, 1.7, -12], [-168, 7, -88], 5, 0)
      .night(0.85, 5, 1)
      .duck(0.25, 3, 1)
      .glow('brush', 1, 3, 3.5, { flicker: 0, color: ELECTRIC })
      .glow('stager-beckwith', 0.7, 3, 4, { flicker: 1, color: GAS })
      .glow('wade-randall', 0.6, 3, 4.5, { flicker: 1, color: GAS })
      .bed('hum-electric', 0.12, 3, 3.5)
      .caption('[a low electric hum, very quiet]', 4, 4);
  }, 14);

  k.stop('The walk to the Arcade', {
    text: 'Into his seventies, Brush walked thirty blocks to work almost every day. His office was in the Arcade, which he helped build with his arc-light money.',
    archive: [{ label: 'The Arcade (a CPL view, still to pick)', id: 'CPL Digital Gallery' }],
  }, (s) => {
    // morning: a sketched figure (drawn, not a likeness) sets off west down the north sidewalk;
    // the camera follows a few steps, then lets him go
    s.bed('hum-electric', 0, 2, 0)
      .glow('brush', 0, 2, 0).glow('stager-beckwith', 0, 2, 0).glow('wade-randall', 0, 2, 0)
      .night(0, 3, 0)
      .duck(0.8, 3, 0)
      .cut([-190, 1.6, -14.2], [-206, 1.3, -12.6], 0)
      .figure('brush-walk', 'walker', { x: -196, z: -12.2, o: 0, flip: true }, 0.01, 0)
      .figure('brush-walk', 'walker', { o: 1 }, 1.2, 0.6)
      .figure('brush-walk', 'walker', { x: -233, z: -12.2 }, 26, 0.8)
      .shot([-196, 1.6, -14.2], [-214, 1.3, -12.6], 5, 1.5, 'sine.inOut')
      .figure('brush-walk', 'walker', { o: 0 }, 2, 11)
      .sound('step-flagstone', { gain: 0.25, at: [-200, 0.2, -12.2] }, 1)
      .caption('[footsteps, going away]', 1.5, 4);
  }, 13);

  k.stop('By his own will', {
    text: 'The windmill was gone by 1912. Brush died in 1929, and his will ordered the house torn down. The story goes that Henry Ford came on demolition day and left with a crystal doorknob.',
  }, (s) => {
    // the windmill vanishes first, then the house dissolves into construction lines
    s.shot(STREET, LOOK, 4, 0).fov(44, 3, 0)
      .sound('ui-erase', { gain: 0.4 }, 3)
      .gone('windmill', 1, 0.5, 3)
      .caption('[the windmill: gone by 1912]', 3, 3)
      .sound('ui-sketch', { gain: 0.4 }, 7)
      .gone('brush', 0.5, 3, 7)
      .gone('brush', 1, 3, 10.5)
      .caption('[1929: the house, by his will]', 7.2, 4);
  }, 15);

  return k.finish('Where the house stood: the American Red Cross, since 1990.', 'street', 2);
}
