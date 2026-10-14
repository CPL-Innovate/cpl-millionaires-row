import { Kit, house } from './kit';

// 5 · The Misfire: why did a man try to shoot Sylvester Everett, and how did the families end up
// related? Street level at the intersection, the NW → NE sightline. Script: threads-scripts §5.
// Flags carried: M11 (Dutka 2015 ch. 11) is effectively the only source for the 1884 attack and no
// 1884 newspaper has been found; the place is unknown, so stop 3 shows no landmark. Streetcars were
// banned on this stretch, so the conductor's car was on another street: one more reason to keep it
// unlocated. Confirm the wedding's Lawrence is the same son. "Presidents came to dinner" sidesteps
// the five / four / six count. Everett built "in the mid-1880s" (1883–87): no move-in date.

export function misfire() {
  const ev = house('everett');
  const k = new Kit({ pos: [12, 1.7, -11], tgt: [ev.x - 2, 8, ev.z], scene: 'street', reveal: [14, -14] });

  k.stop('The castle on the corner', {
    text: 'Sylvester Everett, banker, built here in the mid-1880s, across Case Avenue from his wife’s family, the Wades. Forty fireplaces. Presidents came to dinner.',
    archive: [
      { label: 'Sylvester T. Everett', id: 'Dutka, Misfortune (2015) ch. 11 fig. 2, credited CPL' },
      { label: 'Everett house under construction, c. 1886', id: 'CPL p4014coll14:56' },
    ],
  }, (s) => {
    // from the NE sidewalk, push toward the house as it assembles from construction lines into stone
    s.gone('everett', 0.5, 0.01, 0)
      .shot([14, 1.7, -14], [ev.x - 3, 10, ev.z], 10, 0, 'sine.inOut')
      .sound('ui-sketch', { gain: 0.45 }, 1.5)
      .gone('everett', 0, 6, 1.5, 'power1.inOut')
      .caption('[the house goes up, line by line]', 2, 4);
  }, 12);

  k.stop('The bank', {
    text: 'The Everett brothers’ bank collapsed. One of the men it ruined was Horace Weddell, a banker and railroad investor.',
    archive: [{ label: 'Horace Weddell', id: 'Dutka, Misfortune (2015) ch. 11 fig. 1, credited CPL' }],
  }, (s) => {
    // the street dims; one panel, no move
    s.night(0.45, 3, 0).duck(0.5, 3, 0);
  }, 9);

  k.stop('November 10, 1884', {
    text: 'Weddell jumped from his carriage, got within six feet of Everett, put a pistol to his chest and pulled the trigger. It didn’t fire. Where exactly this happened, nobody wrote down.',
  }, (s) => {
    // low, close, handheld; a stretch of sidewalk with no landmark, framed loose on purpose
    // looking west along the south sidewalk, where the modelled block runs out: no house in frame
    s.cut([-150, 0.95, 13.5], [-162, 0.3, 14.6], 0)
      .fov(34, 0.01, 0)
      .shake(0.05, 0.5, 0)
      .shot([-152, 0.9, 13.6], [-164, 0.35, 14.8], 9, 0, 'none')
      .evidence(0.55, 2, 0)
      .night(0.6, 2, 0)
      .quiet(true, 0)
      .duck(0.15, 1.5, 0)
      .sound('misfire', { gain: 0.9 }, 4.5)
      .caption('[a dry click]', 4.6, 2.2)
      .duck(0, 0.3, 5)
      .caption('[nothing]', 6.8, 2.5);
  }, 14);

  k.stop('“The best of friends”', {
    text: 'A streetcar conductor helped disarm him. Everett went inside and came back out with his own gun. Then he told the Leader: “Mr. Weddell and I are the best of friends.”',
  }, (s) => {
    // pull back to a wide shot of the corner
    s.shake(0, 0.5, 0)
      .fov(50, 0.01, 0)
      .evidence(0, 1.5, 0)
      .cut([-9, 2.4, 1], [10, 6, -24], 0)
      .shot([-14, 3, 4], [12, 6, -26], 9, 0, 'power1.out')
      .night(0.25, 3, 0)
      .quiet(false, 1)
      .duck(0.7, 3, 0.5);
  }, 12);

  k.stop('The wedding', {
    text: 'Weddell’s son Lawrence had flagged down that streetcar. Around 1890 he married Everett’s daughter Eleanor, in this house. Quietly: across Case Avenue, old Jeptha Wade lay dying.',
    footer: 'Missing from most tellings: Mary Timmerman, the Weddell nursemaid who became Horace’s secret wife.',
  }, (s) => {
    // back to the NE corner, warm light in the windows
    s.shot([10.5, 1.6, -1.8], [23.4, 11.6, -44.9], 5, 0)
      .night(0.5, 4, 0.5)
      .glow('everett', 1, 3, 2.5, { flicker: 1 })
      .duck(0.45, 3, 1);
  }, 12);

  return k.finish('The house came down in 1938. The site is a parking lot.', 'street', 2);
}
