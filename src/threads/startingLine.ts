import { Kit } from './kit';

// 9 · The Starting Line: what happened on this corner every winter afternoon? Street level at
// E. 40th in a winter state ("It's November now, not October"). Script: threads-scripts §9.
// Flags carried: the winter is an invented state (a snow grade and falling snow over the October
// scene: the trees keep their leaves); crowds and sleighs are invented, so they are drawn; no
// specific racer is put in a specific race; the shabby farmer is lore ("the story goes").

export function startingLine() {
  const k = new Kit({ pos: [8, 1.7, 2], tgt: [-60, 3, 1], scene: 'street', reveal: [0, 0] });

  k.stop('Snow', {
    text: 'November to December, 1875 to 1905. Wednesday to Saturday afternoons.',
    footer: 'It’s November now, not October.',
  }, (s) => {
    // at the corner, looking west; snow falls, the lawns and roofs whiten
    s.snow(0.9, 1, 6, 0.5)
      .carriages(false, 0) // November: sleighs, not the October carriages
      .quiet(true, 0)
      .duck(0, 2, 0)
      .bed('snow-wind', 0.55, 3, 0)
      .bed('sleigh-race', 0.2, 3, 2, { lowpass: 1400 })
      .shot([6, 1.7, 2], [-60, 3, 1], 10, 0, 'sine.inOut')
      .caption('[snow; sleigh bells in the distance]', 2.5, 5);
  }, 11);

  k.stop('Red flags', {
    text: 'Red flags at E. 40th and E. 9th closed Euclid to traffic. This corner was the starting line.',
  }, (s) => {
    // red flags rise at the corner; push down the empty Avenue
    for (const [i, z] of [-10.2, 10.2].entries()) {
      s.figure(`flag-${i}`, 'flag', { x: -9, z, y: -2.6, s: 1.2 }, 0.01, 0)
        .figure(`flag-${i}`, 'flag', { o: 1 }, 0.4, 1 + i * 0.6)
        .figure(`flag-${i}`, 'flag', { y: 0 }, 1.6, 1 + i * 0.6, 'power2.out');
    }
    s.sound('flag-flap', { gain: 0.6 }, 1)
      .caption('[flags snapping in the cold]', 1.2, 3)
      .shot([-6, 1.7, 2], [-80, 2.6, 1], 8, 3, 'power1.inOut');
  }, 11);

  // the field: sleighs drawn up across the road at the corner
  const field = Array.from({ length: 8 }, (_, i) => ({ id: `sleigh-${i}`, x: -16 - (i % 2) * 7, z: -6.5 + (i >> 1) * 4.2 + (i % 2) * 1.2 }));
  k.stop('The field', {
    text: 'Fifty to eighty sleighs. Jeptha Wade in a two-horse Russian cutter with red plumes. Rockefeller, Devereux, Hanna. Footmen with charcoal foot warmers, fur robes, bells on the horses.',
    archive: [
      { label: 'Sleigh race past Brush, Beckwith and Randall Wade (drawing)', id: 'Dutka, Images of America (2019) ch. 4 fig. 51, CSU' },
      { label: 'Euclid Avenue in winter, c. 1890', id: 'CPL p4014coll18:54' },
    ],
  }, (s) => {
    // low at road level as the sleighs gather (drawn)
    s.cut([4, 0.9, 6], [-24, 1.2, 0], 0);
    field.forEach((f, i) => {
      s.figure(f.id, 'sleigh', { x: f.x + 30, z: f.z, flip: true }, 0.01, 0)
        .figure(f.id, 'sleigh', { o: 1 }, 0.8, 0.5 + i * 0.5)
        .figure(f.id, 'sleigh', { x: f.x }, 4, 0.5 + i * 0.5, 'power2.out');
    });
    s.bed('sleigh-race', 0.35, 2, 0.5, { lowpass: 2200 })
      .caption('[harness bells, horses blowing in the cold]', 1, 5);
  }, 15);

  // the crowd along both fences
  const crowd = Array.from({ length: 36 }, (_, i) => ({ id: `watch-${i}`, x: -6 - (i % 18) * 2.3 - ((i * 7) % 3) * 0.4, z: (i < 18 ? -14.4 : 14.4) + ((i * 5) % 3) * 0.3 }));
  k.stop('The crowd', {
    text: 'Thousands came to watch, packed along the fences. The speed limit was six miles an hour. The trotters did twenty-five to thirty.',
  }, (s) => {
    // swing to the fences: the crowd, sketched, in buffalo coats
    crowd.forEach((c, i) => s.figure(c.id, 'crowd', { x: c.x, z: c.z }, 0.01, 0).figure(c.id, 'crowd', { o: 1 }, 0.6, 0.3 + (i % 9) * 0.12));
    s.shot([-2, 1.8, 6], [-30, 1.6, -15], 4, 0, 'power2.inOut')
      .shot([-2, 1.8, 6], [-30, 1.6, 15], 6, 5, 'sine.inOut')
      .bed('crowd-snow', 0.5, 2, 0.5)
      .caption('[thousands along the fences, muffled by snow]', 1, 5);
  }, 13);

  k.stop('Go', {
    text: 'The story goes that a shabby farmer often beat them all.',
  }, (s) => {
    // the sleighs launch west; the camera chases a few seconds, then stops at the edge of the
    // modelled block and lets them go; a map insert traces the course to E. 9th
    s.sound('sleigh-go', { gain: 0.8 }, 0.5)
      .caption('[the sleighs go]', 0.6, 3)
      .bed('crowd-snow', 0.8, 0.5, 0.5)
      .bed('sleigh-race', 0, 2, 0.5)
      .shot([-40, 1.8, 3], [-120, 1.6, 0], 4, 0.8, 'power2.in')
      .shot([-60, 1.8, 3], [-200, 1.6, 0], 3, 4.8, 'power2.out');
    field.forEach((f, i) => s.figure(f.id, 'sleigh', { x: f.x - 190 }, 9, 0.6 + (i % 3) * 0.15, 'power1.in'));
    crowd.forEach((c) => s.figure(c.id, 'crowd', { o: 0 }, 1, 9));
    s.bed('crowd-snow', 0, 2, 8)
      .map({ show: 0.94, line: 1, x0: -300, x1: 6000, year: 1890 }, 1.5, 9)
      .map({ course: 1 }, 4, 10.5, 'power1.inOut');
  }, 16);

  return k.finish('The race ran west to E. 9th. That’s a thread for another block.', 'street', 2);
}
