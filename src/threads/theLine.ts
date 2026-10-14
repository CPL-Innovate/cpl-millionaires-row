import { Kit, house } from './kit';

// 3 · The Line: who was allowed on this street, and where exactly did they have to stop? Street
// level on the sidewalk at E. 40th, plus one short map insert. Script: threads-scripts §3.
// Flags carried: confirm the horsecar curve at E. 40th on the 1881/1892 plates before trusting
// the insert (it is drawn schematic); the 1908 crowd is invented, so it is drawn as a sketch; the
// Wilson quotes need L&GH rights clearance. Build note: the Wade gate piers stand on the Euclid
// frontage in the scene (beat "fence"), so the pier-by-pier track runs there, not along Case.

export function theLine() {
  const wade = house('wade-sr');
  const k = new Kit({ pos: [6, 1.7, 3], tgt: [-80, 2.5, 1], scene: 'street', reveal: [0, 0] });

  k.stop('The streetcars turn away', {
    text: 'From E. 22nd to E. 40th, streetcars were banned from Euclid. The city didn’t want to bother the families who lived here with noise, or with easy public access.',
    quote: { text: 'The street cars bound east turned south at 9th, went up Prospect to 40th, and there turned back to Euclid.', who: 'Ella Grant Wilson, Famous Old Euclid Avenue' },
  }, (s) => {
    // the map insert, overhead: the route animates east, swerves south at E. 9th, back at E. 40th
    s.map({ show: 1, line: 1, x0: -300, x1: 6000, dots: 0, year: 1888 }, 0.01, 0)
      .duck(0, 0.3, 0)
      .map({ route: 1 }, 8, 1, 'power1.inOut')
      .sound('streetcar-bell', { gain: 0.55, lowpass: 2500 }, 1.5)
      .sound('streetcar-bell', { gain: 0.25, lowpass: 1200 }, 5)
      .caption('[a horsecar bell, receding]', 1.5, 5);
  }, 14);

  k.stop('This corner is the edge', {
    text: 'This intersection is where the line ended. East of here, the city could ride. West of here, it walked.',
  }, (s) => {
    // drop to the street at E. 40th, looking west down the empty, rail-free Avenue
    s.map({ show: 0 }, 1.8, 0)
      .duck(0.8, 2, 0.5)
      .shot([2, 1.7, 2], [-80, 2.4, 1], 8, 0, 'sine.inOut')
      .bed('hoof-stone', 0.35, 2, 1)
      .caption('[hooves on stone; nothing mechanical]', 2, 5);
  }, 11);

  k.stop('Seven thousand dollars of fence', {
    text: 'The Wade gate piers cost $1,000 each. A girl walking past counted seven: “Seven thousand dollars. My! That would build a house — a big one!”',
    archive: [{ label: '“Stone Pillar, Cost $1,000 — 40th St. and Euclid Ave.”', id: 'Wilson, Famous Old Euclid Avenue II, p. 45' }],
  }, (s) => {
    // slowly along the Wade fence, pier by pier, at a child's eye height
    s.bed('hoof-stone', 0, 2, 0)
      .cut([-8, 1.05, -12.6], [-16, 1.2, -15.4], 0)
      .shot([-96, 1.05, -12.6], [-104, 1.2, -15.4], 16, 0.5, 'none')
      .bed('step-flagstone', 0.3, 1, 0.5)
      .caption('[footsteps on the sidewalk]', 1, 4);
    [-12, -36, -44, -62, -80, -88, -100].forEach((x, i) => s.caption(`$${i + 1},000`, 0.5 + ((-8 - x + 5) / 88) * 16, 1.4));
  }, 17);

  k.stop('Through the bars', {
    quote: { text: 'I grew up to regard Mrs. Wade as my Lady Bountiful when I peeked through the high iron fence.', who: 'Ella Grant, later Wilson' },
    archive: [{ label: 'Ella Grant at about 27, 1881', id: 'Wilson, Famous Old Euclid Avenue I, p. 74' }],
  }, (s) => {
    // stop at the fence; the villa through the iron bars
    s.bed('step-flagstone', 0, 0.6, 0)
      .shot([-40.5, 1.15, -14.7], [wade.x, 6, wade.z], 4, 0, 'power2.out')
      .fov(40, 4, 0);
  }, 11);

  k.stop('Nabobs and Bobs', {
    text: 'North side: “estates,” on a ridge with a lake view. South side: plain “houses and lots.” The north-siders were called nabobs. The south-siders, Bobs.',
    footer: 'Charles Brush lived on the south side in 1881. By 1887 he’d crossed the street. (1881 plate vs. 1887)',
  }, (s) => {
    // swing 180° from the north side (big lots, deep lawns) to the south (closer to the street)
    s.fov(50, 2, 0)
      .turn([-70, 1.7, 0], 352, 172, 10, 0.5, { dist: 40, ty: 5 });
  }, 13);

  k.stop('The door that stayed shut', {
    text: 'She pitched flowers for Mrs. Wade’s reception. Mr. Wade overruled her: “I guess we will have to rely upon our home talent.” She never met him again.',
  }, (s) => {
    // push toward the Wade front door; it stays shut; pull back to the sidewalk
    s.cut([wade.x, 1.7, -18], [wade.x, 3, wade.z], 0)
      .shot([wade.x, 1.7, -58], [wade.x, 2.6, wade.z], 6, 0.3, 'power2.inOut')
      .sound('gate-iron', { gain: 0.6 }, 6.2)
      .caption('[a gate shuts]', 6.3, 2.5)
      .shot([wade.x, 1.7, -13.5], [wade.x, 4, wade.z], 5, 7, 'power2.inOut');
  }, 13);

  // the 1908 crowd: two dozen sketched walkers washing east down the roadway
  const crowd = Array.from({ length: 30 }, (_, i) => ({ id: `march-${i}`, z: -6 + (i % 6) * 1.7 + ((i * 37) % 7) * 0.12, x0: -30 - Math.floor(i / 6) * 2.4 - ((i * 13) % 5) * 0.5 }));
  k.stop('The line breaks', {
    text: '1908: a Labor Day parade marched through on purpose: “We want to show the mayor the strength of labor.” 1915: the ban ended. A newspaper said hundreds of thousands had been inconvenienced “to save a few dozen families.”',
  }, (s) => {
    // time-lapse on the empty Avenue: the crowd washes through (drawn, not photo-real), then the
    // streetcar rails draw themselves down the middle of the street
    s.cut([10, 2.2, 6.5], [-30, 1.2, -1], 0)
      .bed('crowd-parade', 0.6, 1.5, 0.5)
      .caption('[1908: drums, a band, a crowd marching]', 0.8, 5);
    crowd.forEach((c, i) => {
      s.figure(c.id, 'crowd', { x: c.x0, z: c.z, o: 0 }, 0.01, 0)
        .figure(c.id, 'crowd', { o: 1 }, 1, 0.4 + (i % 5) * 0.15)
        .figure(c.id, 'crowd', { x: c.x0 + 30 }, 11, 0.4)
        .figure(c.id, 'crowd', { o: 0 }, 1.2, 9.6 + (i % 4) * 0.2);
    });
    s.bed('crowd-parade', 0, 2.5, 9)
      .rails(1, 6, 10.5)
      .sound('streetcar-rails', { gain: 0.7 }, 12)
      .caption('[1915: rails, and a streetcar on them]', 12, 5);
  }, 19);

  return k.finish('The fence is gone. The sidewalk was always public. You’re standing on it.', 'street', 2);
}
