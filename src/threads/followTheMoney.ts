import { Kit } from './kit';

// 6 · Follow the Money: where did the money on this corner come from, and what did it cost the
// people outside the fence? Street level, a corner per stop. Script: threads-scripts §6.
// ⚠ Read with L&GH first: the thread most likely to read as editorialising, so it keeps to
// numbers and quotes. Flags carried: why the houses came down has two accounts (urban decay vs
// commercial value), so no single cause is stated; "one of the plainest houses" is our reading
// (IoA: "one of Euclid Avenue's least pretentious houses" could be quoted instead). Build notes:
// the Burgert house is a ghost massing block (its size and the distance it moved are not known);
// 3844 (Ellison) isn't modelled, so stop 5 pans across the south side without a house to land on.

const SMOKE: [number, number, number] = [0.86, 0.8, 0.72];

export function followTheMoney() {
  const k = new Kit({ pos: [6, 1.7, 6], tgt: [-30, 4, 40], scene: 'street', reveal: [0, 10] });

  k.stop('The biggest lot on the corner', {
    text: 'Rockefeller paid $40,000 for 116 feet of frontage. Then he bought the corner lot and had the house on it moved down Case Avenue on greased logs, half an inch at a time. 231 feet of frontage, and one of the plainest houses on the street.',
    quote: { text: 'It moved so slowly that there was only a movement of one-half inch at a time.', who: 'Ella Grant Wilson, who went to watch' },
    archive: [{ label: 'Rockefeller residence', id: 'CPL p4014coll18:3475', img: '/img/rockefeller-3475.jpg' }],
  }, (s) => {
    // the Burgert house, in pencil, on the corner lot; it slides south down Case Avenue
    s.ghost({ x: -21, z: 25, w: 12, h: 9, d: 10 }, 0.01, 0)
      .ghost({ o: 1 }, 1.5, 1)
      .sound('ui-sketch', { gain: 0.4 }, 1)
      .caption('[a house drawn in on the corner lot]', 1.2, 3)
      .ghost({ z: 52 }, 14, 4, 'none')
      .sound('greased-logs', { gain: 0.6 }, 4)
      .caption('[greased logs, creaking]', 4.5, 5)
      .shot([4, 1.7, 14], [-26, 4, 52], 16, 1, 'sine.inOut')
      .ghost({ o: 0 }, 2, 17);
  }, 19);

  k.stop('The refinery that said no', {
    text: 'Ella Grant’s father ran a refinery that refused to join Rockefeller’s combination. It was crushed. The family sold the parlour furniture. Her father never set foot in a church again and called Rockefeller “that scoundrel.”',
    footer: 'She watched the house move. She also never forgave him.',
  }, (s) => {
    // hold on the Rockefeller front walk
    s.shot([-50, 1.7, 22], [-58, 6, 62], 5, 0);
  }, 13);

  k.stop('The mill behind the villas', {
    text: 'Jeptha Wade helped found the Cleveland Rolling Mill in 1863. In 1882, 5,000 workers struck. In 1885, a three-month strike: stones were thrown and a foreman fired into a crowd. The owners complained about the smoke from their own factories.',
    archive: [{ label: 'The Cleveland Rolling Mill', id: 'Dutka, Misfortune (2015) ch. 13 fig. 3' }],
  }, (s) => {
    // NW corner; the sky above the villas takes on a faint smoky tint
    s.shot([-61, 1.7, -16], [-61, 9, -84], 5, 0)
      .tint(SMOKE, 0)
      .night(0.35, 5, 2)
      .caption('[a faint haze over the villas]', 3, 4);
  }, 15);

  k.stop('The bank', {
    text: 'Sylvester Everett started at 14 as a bank messenger. His brothers’ bank later collapsed and ruined at least one neighbour (see The Misfire).',
  }, (s) => {
    s.night(0, 3, 0)
      .shot([10.5, 1.6, -1.8], [23.4, 11.6, -44.9], 5, 0);
  }, 10);

  k.stop('Who paid the florist', {
    text: 'The florist who left us the best account of this street had backers from it: Charles Brush, General Barnett, D. Z. Norton and her neighbour Henry Ellison at 3844, “always ready to give me good, fatherly advice.”',
  }, (s) => {
    // from 3725 on the north side, across to the south side, where 3844 stood
    s.cut([-200, 1.7, -2], [-205, 8, -85], 0)
      .shot([-200, 1.7, -2], [-205, 8, -85], 1, 0)
      .turn([-170, 1.7, 0], 345, 165, 9, 2, { dist: 40, ty: 4 })
      .caption('3725', 1, 2.5)
      .caption('3844 (not modelled)', 9.5, 3);
  }, 15);

  k.stop('The number that emptied the Row', {
    text: 'Everett’s property was valued at $39,000 in 1890. By 1920: $604,000. Its taxes went from $1,100 to $14,000. Randall Wade’s house: $100,000 to $1,000,000 between 1900 and 1920. The land was worth more as anything but a house.',
    numbers: [
      { value: '$39k → $604k', label: 'Everett, valued, 1890 → 1920' },
      { value: '$1.1k → $14k', label: 'its taxes' },
      { value: '$100k → $1M', label: 'Randall Wade, 1900 → 1920' },
    ],
  }, (s) => {
    // wide across the intersection, onto Everett's house (high shots here end up in the elm crowns)
    s.shot([-6, 3.5, -2], [22, 9, -40], 6, 0, 'power2.inOut').fov(55, 6, 0);
  }, 18);

  return k.finish('By 1931, 1% of Cleveland’s elite lived on Euclid.', 'street', 2);
}
