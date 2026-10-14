import { Kit } from './kit';

// 7 · Afterlives: what happened to each corner after the families left? Street level, corner by
// corner: each house thins to a pencil wash, shifts into its later use, then goes. Script:
// threads-scripts §7.
// Flags carried: Arena dates 1937–74 (IoA) vs demolished 1977 (ECH); the Moondog Ball is "often
// called" the first rock concert; the Children's Museum dates are snippets to verify; the Neal
// Institute's date is unknown; Marguerite is the first wife's daughter, not Alice's. Build notes:
// the golf flags and the Arena crowd are drawn sketches (invented); the 1932 garden at 3036 is off
// the modelled block, so its montage is of this block's own stones and planting.

export function afterlives() {
  const k = new Kit({ pos: [10.5, 1.6, -1.8], tgt: [23.4, 11.6, -44.9], scene: 'street', reveal: [10, -2] });

  // little golf flags on the Everett front lawn
  const flags: [number, number][] = [[14, -24], [22, -21], [31, -26], [38, -20], [26, -30]];
  k.stop('Everett (NE)', {
    text: 'Everett died here in 1922. The house became apartments, with a small golf course on the front lawn. In 1933 his daughter Marguerite, now a Berlin baroness, visited for the first time in forty years. Razed 1938.',
    archive: [
      { label: 'The Everett house as apartments', id: 'Ruminski & Dutka, Gilded Age (2012) ch. 1 fig. 30, credited CPL' },
      { label: 'The site today', id: 'Dutka, Images of America (2019) ch. 4 fig. 53' },
    ],
  }, (s) => {
    s.evidence(0.45, 2.5, 0.5);
    flags.forEach(([x, z], i) => s.figure(`golf-${i}`, 'flag', { x, z, s: 0.45 }, 0.01, 0).figure(`golf-${i}`, 'flag', { o: 1 }, 0.5, 2 + i * 0.45).sound('ui-tap-2', { gain: 0.25 }, 2 + i * 0.45));
    s.caption('[little flags pop up on the lawn]', 2, 3.5);
    flags.forEach((_, i) => s.figure(`golf-${i}`, 'flag', { o: 0 }, 1, 11));
    s.sound('ui-sketch', { gain: 0.35 }, 11)
      .gone('everett', 0.5, 2, 11)
      .gone('everett', 1, 2.5, 13.2)
      .caption('1938', 11.5, 2.5);
  }, 16);

  k.stop('Rockefeller (SW)', {
    text: 'After Rockefeller moved to New York, his house became the Neal Institute, a three-day cure for drinking based on “vegetable substances.” Then a furniture store, then apartments. Razed 1938. Today the Northeast Ohio Regional Sewer District is here.',
    archive: [{ label: 'The site now', id: 'Dutka, Images of America (2019) ch. 4 fig. 46' }],
  }, (s) => {
    s.shot([-33, 1.6, 30], [-60, 7, 64], 4, 0)
      .sound('ui-sketch', { gain: 0.35 }, 11)
      .gone('rockefeller', 0.5, 2, 11)
      .gone('rockefeller', 1, 2.5, 13.2)
      .caption('1938', 11.5, 2.5);
  }, 16);

  k.stop('Wade (NW)', {
    text: 'Jeptha Wade’s house came down by his own order. His son Randall’s stood until 1934. In 1955 a sweater factory took the site. Today it’s the Jane Edna Hunter Social Services Center, named for a sharecroppers’ daughter who became a nurse and a lawyer.',
    archive: [{ label: 'The site now', id: 'Dutka, Images of America (2019) ch. 4 fig. 49' }],
  }, (s) => {
    // the corner villa is already gone (1890); Randall's holds on, then drains away
    s.gone('wade-sr', 1, 0.01, 0)
      .shot([-61, 1.7, -16], [-61, 7, -84], 4, 0)
      .sound('ui-sketch', { gain: 0.35 }, 9)
      .gone('wade-randall', 0.5, 2.5, 9)
      .gone('wade-randall', 1, 3, 11.7)
      .caption('1934', 9.5, 2.5);
  }, 17);

  // the public finally gets in: a sketched crowd crossing onto the old Brush lot
  const fans = Array.from({ length: 22 }, (_, i) => ({ id: `fan-${i}`, x: -232 + (i % 11) * 2.6 + ((i * 7) % 3) * 0.5, z: -7 - Math.floor(i / 11) * 1.8 }));
  k.stop('Brush (3725)', {
    text: 'Torn down by Brush’s will in 1929. In 1937 the Cleveland Arena opened on the site. In 1952 Alan Freed’s Moondog Coronation Ball was held there, often called the first rock ’n’ roll concert.',
    archive: [{ label: 'The Cleveland Arena, 1940', id: 'Ruminski & Dutka, Gilded Age (2012) ch. 1 fig. 24, credited CPL' }],
  }, (s) => {
    // track west to 3725: the house and the windmill already gone
    s.gone('brush', 1, 0.01, 0)
      .gone('windmill', 1, 0.01, 0)
      .shot([-218, 1.7, -2], [-205, 6, -90], 6, 0, 'power1.inOut');
    fans.forEach((f, i) => {
      s.figure(f.id, 'crowd', { x: f.x, z: f.z }, 0.01, 0)
        .figure(f.id, 'crowd', { o: 1 }, 0.6, 7 + (i % 6) * 0.15)
        .figure(f.id, 'crowd', { x: f.x + 6 - (i % 5), z: -38 - (i % 4) * 3 }, 7, 7.5, 'power1.in')
        .figure(f.id, 'crowd', { o: 0 }, 1, 13.5);
    });
    s.sound('crowd-arena', { gain: 0.7 }, 7.5)
      .caption('[a burst of crowd noise: the public finally gets in]', 7.6, 4.5);
  }, 16);

  k.stop('The garden made of mansions', {
    text: 'In 1932 a garden at 3036 Euclid was built from the wreckage: vines from the Brush estate, cuttings from other gardens, “stones from the various homes that have been demolished.”',
  }, (s) => {
    // a quick montage: stones, vines (this block's own piers and planting)
    s.fov(40, 0.01, 0)
      .cut([-36.5, 1.5, -11], [-36, 1.2, -15.3], 0)
      .sound('ui-paper', { gain: 0.4 }, 0)
      .fov(45, 0.01, 4)
      .cut([-136, 1.3, -79], [-136, 0.9, -86], 4)
      .sound('ui-paper', { gain: 0.4 }, 4)
      .fov(40, 0.01, 8)
      .cut([-62, 1.5, -11.5], [-62, 1.1, -15.3], 8)
      .sound('ui-paper', { gain: 0.4 }, 8)
      .caption('[stones, vines]', 0.5, 4)
      .hold(12);
  }, 12);

  k.stop('The survivors', {
    text: 'Stager-Beckwith: the University Club for ninety years, then abandoned, sold by the land bank for $50,000 in 2014, and opened as the Cleveland Children’s Museum in 2017. St. Paul’s: a Poor Clares shrine since 1931.',
    archive: [{ label: 'Stager–Beckwith as the Cleveland Children’s Museum, 2025', id: 'CPL p4014coll18:12361' }],
  }, (s) => {
    // the only two still in colour: the survivors take the watercolour, everything else thins away
    s.fov(50, 0.01, 0)
      .evidence(0.85, 3, 0)
      .look(1, 0.45, 2.5, 1)
      .cut([-134.15, 1.6, -66.37], [-136.59, 6.18, -94.26], 0)
      .shot([-128, 2.2, -54], [-136, 7, -94], 7, 0, 'power1.out')
      .shot([8, 1.2, -12], [15.8, 19, 17.7], 0.01, 8)
      .shot([2, 1.6, -20], [15.8, 17, 17.7], 7, 8.1, 'power1.out');
  }, 16);

  return k.finish('These still stand. Go see them.', 'street', 2);
}
