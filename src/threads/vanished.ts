import { Kit } from './kit';

// 1 · Vanished: how did the Row rise and disappear, and what's left?
// The map layer (threads/AvenueMap: the whole Avenue as one ink line, houses as dots by street
// number), with a final drop to the street at E. 40th. Script: threads-scripts §1.
// Flags carried: every year comes from the mansion survey, a web pass with unverified rows — all
// need a check (especially Stone 1910, Witt/Statler 1912, Everett 1938 vs 1940, Perry-Payne 1949).
// "Richest street in America, or close to it" is framing; the sourced "Showplace of America" is the
// alternative. West of E. 30th nothing is plate-checked, so it stays dots, never outlines.

const ATLAS = { pos: [-273, 175, 0] as [number, number, number], tgt: [-15, 0, 0] as [number, number, number] };
// the sidewalk across Euclid from St. Paul's: one of the two survivors right here, the lost houses as construction lines
const END = { pos: [-8, 1.7, -12] as [number, number, number], tgt: [16, 12, 18] as [number, number, number] };

export function vanished() {
  const k = new Kit({ pos: ATLAS.pos, tgt: ATLAS.tgt, scene: 'atlas' });

  k.stop('The road east', {
    text: 'Euclid Avenue started as a road out of town. In the 1830s and ’40s the first big houses went up near Public Square.',
    archive: [{ label: '1881 Hopkins atlas, Plates 3 and 5: under the line at E. 40th', id: 'G. M. Hopkins, Cleveland atlas, 1881', img: '/plates/euclid-case-1881.jpg' }],
  }, (s) => {
    s.map({ show: 1 }, 0.01)
      .duck(0, 0.5)
      .map({ line: 1 }, 5.5, 0.6, 'power1.inOut')
      .map({ plate: 1 }, 3, 4.5)
      .bed('amb-wind-bare', 0.5, 2, 0)
      .caption('[wind]', 0.5, 3.5)
      .sound('carriage-pass-1', { gain: 0.3, lowpass: 900 }, 3)
      .caption('[a single carriage, far away]', 4, 4);
  }, 10);

  k.stop('The city reaches Case Avenue', {
    text: 'By 1850 the city reached Case Avenue, today’s E. 40th. By 1865, 68 estates lined the Avenue between E. 21st and E. 55th.',
    footer: 'Stager–Beckwith, 1866: the oldest one still standing.',
  }, (s) => {
    s.map({ x0: -300, x1: 6400, year: 1840, showYear: 1 }, 3, 0)
      .map({ dots: 5600, year: 1866 }, 9, 0.5, 'power1.inOut')
      .map({ focus: 'stager' }, 0, 10)
      .sound('hoof-stone', { gain: 0.45, lowpass: 2400 }, 0.5)
      .caption('[hooves come in]', 1, 4)
      .sound('hammer-far', { gain: 0.5 }, 4)
      .caption('[a hammer somewhere]', 4.5, 4);
  }, 14);

  k.stop('The Showplace of America', {
    text: '1868 to 1887: Rockefeller, the Wades, Andrews, Brush, Everett. The richest stretch of street in America, or close to it. A florist who worked inside these houses counted about 260 of them.',
    archive: [
      { label: 'Everett residence, c. 1886', id: 'CPL p4014coll14:63', img: '/img/everett-63.jpg' },
      { label: 'J. H. Wade residence (Sweeny stereograph)', id: 'CPL p4014coll18:8106', img: '/img/wade-8106.jpg' },
    ],
  }, (s) => {
    s.map({ focus: '', dots: 11000 }, 0.01, 0)
      .map({ x0: 2750, x1: 4350, year: 1887 }, 5, 0, 'power2.inOut')
      .map({ names: 1 }, 2, 3.5)
      .bed('band-far', 0.32, 3, 1, { lowpass: 2200 })
      .sound('carriage-pass-2', { gain: 0.55 }, 1.5)
      .caption('[carriages, a distant band]', 2, 5);
  }, 16);

  k.stop('Commerce moves east', {
    text: 'Downtown grew toward them. Stores and hotels replaced the first houses: Amasa Stone’s in 1910, a hotel on the Witt site by 1912. In 1915 the streetcars finally got onto the Row.',
    archive: [{ label: '1912 Sanborn fire insurance map, where it has coverage', id: 'Sanborn Map Co., Cleveland, 1912' }],
  }, (s) => {
    s.map({ names: 0 }, 1, 0)
      .map({ x0: -300, x1: 6400 }, 4, 0.3)
      .bed('band-far', 0, 2, 0)
      .map({ wash: 2600, year: 1915 }, 9, 2, 'power1.inOut')
      .sound('streetcar-bell', { gain: 0.6 }, 9)
      .caption('[a streetcar bell, for the first time]', 9, 4);
  }, 14);

  k.stop('The great emptying', {
    text: 'Before 1885, 61% of Cleveland’s elite families lived on Euclid. In 1915, 11%. By 1931, 1%. In 1928 four families were left, all between E. 32nd and E. 38th: this block.',
    numbers: [{ value: '61%', label: 'before 1885' }, { value: '11%', label: '1915' }, { value: '1%', label: '1931' }],
  }, (s) => {
    s.map({ x0: -300, x1: 10900 }, 3, 0)
      .map({ year: 1931, wash: 3150 }, 10, 1, 'power1.in')
      .map({ span: 1 }, 1.5, 8)
      .bed('traffic-1920s', 0.5, 6, 1)
      .caption('[traffic thickens, gets mechanical]', 3, 5);
  }, 15);

  // one site at a time: the dot goes dark with its year
  const cuts: [string, number][] = [['andrews', 1923], ['johnson', 1927], ['brush', 1929], ['wade-r', 1934], ['rockefeller', 1938], ['everett', 1938], ['payne', 1949], ['hanna', 1959], ['eells', 1959]];
  const NO: Record<string, number> = { andrews: 3033, johnson: 2343, brush: 3725, 'wade-r': 3903, rockefeller: 3920, everett: 4111, payne: 2155, hanna: 2717, eells: 3201 };
  k.stop('Demolition years', {
    text: 'Andrews’s Folly, 1923 · Tom L. Johnson, 1927 · Brush, 1929 · Randall Wade, 1934 · Rockefeller, 1938 · Everett, 1938 · Perry-Payne, 1949 · Hanna and Eells, 1959, for the Innerbelt freeway.',
  }, (s) => {
    s.map({ span: 0 }, 0.6, 0).bed('traffic-1920s', 0.15, 4, 0);
    cuts.forEach(([id, year], i) => {
      const at = 0.6 + i * 1.7, c = NO[id];
      s.map({ x0: c - 700, x1: c + 700 }, 0.5, at, 'power3.out')
        .map({ focus: id }, 0, at + 0.3)
        .map({ year }, 0.01, at + 0.9)
        .sound('thud-soft', { gain: 0.7 }, at + 0.9);
      if (id === 'payne') s.map({ year: 1949 }, 0.01, at + 0.9); // Perry goes with it
    });
    s.caption('[one soft thud per house]', 1.4, 4);
  }, 17);

  k.stop('Still happening', {
    text: 'Carlin House, 1997, on the National Register when it came down. Allen-Sullivan House, 2021.',
  }, (s) => {
    s.map({ focus: '', x0: -300, x1: 10900 }, 2.5, 0)
      .bed('traffic-1920s', 0, 1.5, 0)
      .bed('amb-wind-bare', 0, 1.5, 0)
      .quiet(true, 0)
      .caption('[silence]', 1, 5)
      .map({ flare: 'carlin', year: 1996 }, 0.01, 2)
      .map({ year: 1997 }, 0.01, 3.4)
      .map({ flare: 'carlin,allen-sullivan', year: 2020 }, 0.01, 5)
      .map({ year: 2021 }, 0.01, 6.4);
  }, 10);

  k.stop('What’s left', {
    text: 'A handful still stand. Two of them are right here.',
    footer: 'Stager–Beckwith, 3813 Euclid · St. Paul Shrine, E. 40th · Mather, 2605 · Howe, 2258 · the Devereux core in the Fine Arts Building, 3226 · Drury, 8615 · White, 8937 · Dunham Tavern, 6709.',
  }, (s) => {
    s.map({ flare: '', year: 2026 }, 0.01, 0)
      .map({ survivors: 1 }, 2.5, 0.5)
      // then down to E. 40th: the map lifts off the drawing, the camera drops to the sidewalk
      .map({ show: 0, showYear: 0 }, 2, 6)
      .gone('wade-sr', 1, 0.01, 6)
      .gone('everett', 0.5, 0.01, 6)
      .gone('wade-randall', 0.5, 0.01, 6)
      .gone('brush', 0.5, 0.01, 6)
      .gone('rockefeller', 0.5, 0.01, 6)
      .shot([-120, 70, 2], [-10, 0, -6], 3.5, 6.5, 'power2.in')
      .shot(END.pos, END.tgt, 4, 10, 'power3.out')
      .scene('street', 4.5, 9.5, [-8, -12])
      .quiet(false, 10)
      .duck(1, 4, 10)
      .caption('[the street, 1888]', 11, 4);
  }, 18);

  return k.finish('These still stand. Go see them.', 'street', 2);
}
