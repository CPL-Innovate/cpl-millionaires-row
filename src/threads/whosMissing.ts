import { Kit } from './kit';

// 8 · Who's Missing: who lived and worked on this corner but doesn't appear in the record? Street
// level. Rule: no invented figures. Absences are shown as empty frames, blank caption cards,
// "name unknown". Script: threads-scripts §8.
// Flags carried: the thinnest thread and the most important to get right; the 1880 census sheets
// and the Gazette read come before scripting further; the end card needs a real CPL intake path
// before launch. Build note: CPL 59 and 61 aren't in the build yet, so stops 1–2 push into an
// empty frame with the record's pointer — the photographs should replace them.

export function whosMissing() {
  const k = new Kit({ pos: [10.5, 1.6, -1.8], tgt: [23.4, 11.6, -44.9], scene: 'street', reveal: [10, -2] });

  k.stop('Look closer', {
    text: 'Of all CPL’s photographs of this block, only two show ordinary people. Here’s one: a man at Everett’s carriage porch, about 1887. Name unknown.',
    focus: { label: 'Everett’s carriage porch, c. 1887', id: 'CPL p4014coll14:59', note: 'Name unknown.' },
  }, (s) => {
    s.evidence(0.6, 2, 0).night(0.15, 2, 0).duck(0.6, 2, 0);
  }, 13);

  k.stop('The other one', {
    text: 'The other: a man in a bowler hat on a bench at the empty Wade corner, 1895. Also unknown.',
    focus: { label: 'The empty Wade corner, 1895', id: 'CPL p4014coll18:61', note: 'Also unknown.' },
  }, (s) => {
    s.gone('wade-sr', 1, 0.01, 0).shot([-44, 1.7, -22], [-46, 4, -84], 3, 0);
  }, 11);

  k.stop('Twenty-eight servants', {
    text: 'The Everett house ran on 28 servants. Many of the Avenue’s servants were Irish women. In everything we’ve found, not one of them at these houses is named.',
    blanks: 28,
  }, (s) => {
    // back to the Everett house; twenty-eight blank caption cards
    s.gone('wade-sr', 0, 0.01, 0)
      .evidence(0.2, 2, 0)
      .night(0, 2, 0)
      .shot([10.5, 1.6, -1.8], [23.4, 11.6, -44.9], 3, 0)
      .bed('household', 0.3, 3, 1)
      .caption('[faint kitchen and household sound, under the street]', 2, 6);
  }, 15);

  k.stop('Named, barely', {
    text: 'One who is named: Mary Timmerman, the Weddell family’s nursemaid, then housekeeper, then Horace Weddell’s secret wife.',
  }, (s) => {
    s.bed('household', 0, 3, 0);
  }, 9);

  k.stop('The neighbours the books skip', {
    text: 'Not everyone here was a millionaire. Dr. Isaac Marshall built a two-family house at 3738 and rented it out, to his neighbours’ horror. Rebecca Rouse at 3826 founded the Soldiers’ Aid Society. You can see her face on the Soldiers’ and Sailors’ Monument downtown.',
    footer: 'On the 1881 map, several of these lots are in women’s names.',
  }, (s) => {
    // slowly along the south side (its houses are massing only: not modelled)
    s.turn([-120, 1.7, 3], 120, 240, 14, 0, { dist: 40, ty: 4 });
  }, 16);

  k.stop('The biggest gap', {
    text: 'We haven’t found a single documented Black or immigrant resident of this block before the 1950s. Cleveland’s Black newspaper, the Gazette, was publishing in 1888. We haven’t read it yet.',
  }, (s) => {
    // wide over the intersection; it goes quiet
    s.shot([-6, 3.5, -2], [22, 9, -40], 5, 0)
      .duck(0, 4, 2)
      .quiet(true, 2)
      .caption('[quiet]', 6, 4);
  }, 14);

  return k.finish('If you know a name, tell us. CPL Local & Global History.', 'street', 2);
}
