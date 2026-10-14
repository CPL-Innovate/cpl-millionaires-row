import { Kit, type Stop, type Vec3 } from './kit';

// 11 · Four Corners: how did one family end up facing itself across an intersection, and who was
// the odd one out? The one thread that stands in the road: the middle of E. 40th and Euclid is the
// only place all four corners are in view. Script: threads-scripts §11.
// Flags carried: Wade's demolition is 1890 (Wilson) vs 1892 (CPL 8124), so the copy says
// "ordered"; the windowless room is from M11 and Wick (All Rights Reserved: paraphrased);
// "plainest house on the biggest lot" is our reading (IoA: "least pretentious"); "Everett's
// daughter," not "Alice's daughter" (which wife was Eleanor's mother isn't settled); no move-in date.

// in the road, on Case Avenue's line just north of Euclid's centre: clear of the carriage lanes (z ±3.4)
const MID: Vec3 = [0, 1.7, -7];
// compass headings from the middle of the intersection to each corner's house
const H = { randall: 312, wade: 335, everett: 40, church: 147, rockefeller: 221 };

// the corner labels pass as captions while the camera turns (h0 → h1 over dur)
function turnLabels(s: Stop, h0: number, h1: number, dur: number, at: number) {
  const names: [number, string][] = [[H.wade, 'NW · the Wade villas'], [H.everett, 'NE · Everett'], [H.church, 'SE · St. Paul’s'], [H.rockefeller, 'SW · Rockefeller']];
  for (const [h, label] of names) {
    let x = h;
    while (x < h0) x += 360;
    if (x > h1) continue;
    // sine.inOut: invert roughly to find when the heading passes
    const u = (x - h0) / (h1 - h0);
    const t = Math.acos(1 - 2 * u) / Math.PI;
    s.caption(label, at + t * dur - 0.6, 2.4);
  }
}

export function fourCorners() {
  const k = new Kit({ pos: MID, tgt: [-12, 6, -28], scene: 'street', reveal: [0, 0] });

  k.stop('Turn around', {
    text: 'Stand in the middle of E. 40th and Euclid and turn around. Three of these four corners answered to one man.',
  }, (s) => {
    s.turn(MID, 300, 660, 17, 0.5, { dist: 30, ty: 6 });
    turnLabels(s, 300, 660, 17, 0.5);
  }, 18);

  k.stop('Father and son (NW)', {
    text: 'Jeptha Wade, founder of Western Union, on the corner. His son Randall next door. Both families had moved in by October 1866.',
    archive: [
      { label: 'The Randall Wade and J. H. Wade estates', id: 'CPL p4014coll18:9154' },
      { label: 'Jeptha H. Wade', id: 'Ruminski & Dutka, Gilded Age (2012) ch. 1 fig. 25, credited CPL' },
    ],
  }, (s) => {
    // settle on the NW corner: the two villas side by side, the shared drive between them
    s.shot([-61, 1.7, -16], [-61, 7, -84], 5, 0);
  }, 11);

  k.stop('The wedding (1879)', {
    text: '1879. Randall’s only daughter, Alice, married the banker Sylvester Everett in this house. Her grandfather Jeptha gave the groom $10,000 and the bride a necklace of 42 diamonds, valued at $15,000.',
    archive: [{ label: 'Alice Wade Everett (George M. Edmondson; painted late in life)', id: 'CPL Photograph Collection' }],
  }, (s) => {
    // 1879: the Everett house across Case Avenue isn't built yet
    s.gone('everett', 1, 0.01, 0)
      .night(0.35, 4, 0)
      .shot([-80, 1.7, -40], [-84, 7, -82], 8, 0, 'power1.inOut')
      .glow('wade-randall', 1, 3, 2, { flicker: 1 })
      .bed('waltz-glass', 0.25, 3, 2, { lowpass: 700 })
      .caption('[music, faintly, through glass]', 3, 4);
  }, 14);

  k.stop('Across the street (NE)', {
    text: 'Then the couple built here, facing Alice’s childhood home. She was terrified of thunderstorms. Somewhere inside was a soundproof room with no windows, built for her.',
    archive: [{ label: 'Everett residence, oblique from the SW, c. 1886 (the front view is CPL 62)', id: 'CPL p4014coll14:63', img: '/img/everett-63.jpg' }],
  }, (s) => {
    // swing across Case Avenue to the photograph's vantage; the house draws itself in
    s.glow('wade-randall', 0, 2, 0)
      .bed('waltz-glass', 0, 2, 0)
      .night(0, 3, 0)
      .shot([10.5, 1.6, -1.8], [23.4, 11.6, -44.9], 5, 0, 'power2.inOut')
      .gone('everett', 0.5, 0.01, 4.5)
      .sound('ui-sketch', { gain: 0.4 }, 4.5)
      .gone('everett', 0, 4, 5, 'power1.out')
      .caption('[the house draws itself in]', 5, 3.5);
  }, 14);

  k.stop('The church that kept quiet (SE)', {
    text: 'The church on the third corner wasn’t family. It kept its bells silent for the old man anyway.',
    footer: 'See The Silent Bells.',
  }, (s) => {
    s.shot([8, 1.2, -12], [15.8, 19, 17.7], 4.5, 0)
      .duck(0, 1, 4.5)
      .quiet(true, 4.5)
      .caption('[a beat of silence where a bell should be]', 4.6, 3.4)
      .duck(1, 2, 8)
      .quiet(false, 8);
  }, 10);

  k.stop('The outsider (SW)', {
    text: 'The fourth corner was Rockefeller’s: the plainest house on the biggest lot. He moved to New York in 1884 and kept it. In 1888 it was the one corner nobody here was related to.',
    archive: [{ label: 'Rockefeller residence', id: 'CPL p4014coll18:3475', img: '/img/rockefeller-3475.jpg' }],
  }, (s) => {
    // the colour cools slightly
    s.shot([-33, 1.6, 30], [-60, 7, 64], 5, 0)
      .night(0.16, 4, 1);
  }, 12);

  k.stop('1890', {
    text: '1890. Jeptha Wade lay seriously ill. Across Case Avenue, Everett’s daughter Eleanor married, quietly, in the corner house, because of him. He died on 9 August. His will ordered his house torn down, and his grandson oversaw the job.',
  }, (s) => {
    // back to the NW corner, slowly darkening; the corner villa dissolves, Randall's house stays
    s.shot([-44, 1.7, -22], [-46, 6, -84], 5, 0)
      .night(0.5, 8, 0.5)
      .duck(0.45, 4, 1)
      .sound('ui-sketch', { gain: 0.4 }, 7)
      .gone('wade-sr', 0.5, 3.5, 7)
      .sound('ui-erase', { gain: 0.35 }, 11)
      .gone('wade-sr', 1, 3.5, 11)
      .caption('[the corner house is taken down]', 7.5, 4);
  }, 16);

  k.stop('How it ends', {
    text: 'Randall’s house lasted until 1934. Everett’s and Rockefeller’s came down in 1938. The family’s corners are a social-services center and a parking lot now.',
  }, (s) => {
    // a second turn, faster; the corners drop out in order as they pass, St. Paul's stays
    s.night(0, 2.5, 0)
      .duck(1, 2, 0)
      .turn(MID, 300, 660, 10, 0.5, { dist: 30, ty: 6, ease: 'none' })
      .turn(MID, 300, 507, 4, 10.6, { dist: 30, ty: 6, ease: 'power2.out' }); // then settle on the church
    const pass = (h: number) => 0.5 + ((h - 300 + 360) % 360) / 360 * 10;
    for (const [id, h, yr] of [['wade-randall', H.randall, '1934'], ['everett', H.everett, '1938'], ['rockefeller', H.rockefeller, '1938']] as const) {
      s.gone(id, 0.5, 1, pass(h) + 0.4).gone(id, 1, 1.2, pass(h) + 1.4).sound('thud-soft', { gain: 0.5 }, pass(h) + 0.6).caption(yr, pass(h) + 0.2, 1.6);
    }
  }, 16);

  return k.finish('Of the four corners, only the church still stands. Go see it.', 'street', 2);
}
