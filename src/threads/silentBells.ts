import { Kit, house } from './kit';

// 2 · The Silent Bells: why did the bells stop, and who paid?
// Street level at E. 40th, framed on St. Paul's tower (SE corner) with the Wade villas (NW) across
// the intersection. Script: content/2026-10-14-threads-scripts §2.
// Flags carried from the script: Wick's memoir is All Rights Reserved (brief quote, credited);
// don't claim the shrine's bells ring today; the copy says the will "ordered" the house torn down
// (1890 per Wilson vs 1892 per the CPL 8124 record). Wilson quotes need L&GH rights clearance.

const TOWER: [number, number, number] = [15.8, 21, 17.7]; // the tower top (mesh peak 23.9 m), NW corner of the church
// The script asks for the SE curb, looking up; from there the lawn elms hide the tower. Across
// Euclid on the north side is the photographed view (CPL 9222's vantage), so the camera stays there.
const NORTH_CURB: [number, number, number] = [8, 1.2, -12];

export function silentBells() {
  const wade = house('wade-sr');
  const villa: [number, number, number] = [wade.x, 7, wade.z];
  const k = new Kit({ pos: [5, 1.25, -17], tgt: [15.8, 17, 17.7], scene: 'street', reveal: [8, 8] });

  k.stop('Christmas Eve, 1876', {
    text: 'Christmas Eve, 1876. St. Paul’s opens on its new corner, and the bells ring out.',
    archive: [{ label: 'St. Paul’s, c. 1882–90 (Liebich stereograph)', id: 'CPL p4014coll18:9222', img: '/img/st-pauls-9222.jpg' }],
  }, (s) => {
    // 1876: the Everett house isn't built yet (1883–87); the NE corner stays empty until the time jump
    s.gone('everett', 1, 0.01)
      .night(0.82, 0.01)
      .quiet(true)
      .duck(0.35, 1.5)
      .shot(NORTH_CURB, [15.8, 19, 17.7], 9, 0, 'sine.inOut')
      .bed('bells-peal', 1, 0.6, 0.8)
      .caption('[the bells ring out, a full peal]', 0.8, 6);
  }, 10);

  k.stop('Then nothing', {
    text: 'Then they stopped. Across the street lived Jeptha Wade, founder of Western Union. He couldn’t stand them.',
    archive: [{ label: 'Jeptha H. Wade', id: 'Ruminski & Dutka, Gilded Age (2012) ch. 1 fig. 25, credited CPL' }],
  }, (s) => {
    s.bed('bells-peal', 0, 0.12, 0)
      .duck(0, 0.15, 0)
      .caption('[the peal stops]', 0, 2.5)
      .caption('[silence]', 2.5, 3)
      // pan from the tower, across the intersection, to the Wade corner villa
      .shot([1, 1.5, -4], villa, 7, 1.2, 'power2.inOut')
      .fov(30, 6, 2.5)
      .duck(0.6, 5, 5.5)
      .caption('[the October street creeps back in]', 6, 4);
  }, 11);

  k.stop('Three accounts', {
    accounts: [
      { claim: 'The congregation agreed out of respect.', who: 'Ella Grant Wilson, who calls it “a half-forgotten story… as the story goes.”' },
      { claim: 'Wade paid them $1,500.', who: 'Ruminski & Dutka, 2012' },
      { claim: 'Ten thousand dollars.', who: 'A neighbour’s memoir' },
    ],
    footer: 'One book dates the deal to 1874, two years before the church was finished.',
  }, (s) => {
    // hold on the gap between the tower and the villa: from down Case Avenue both are in frame,
    // the church's photographed E. 40th range on the right, the villas far off on the left
    s.shot([-3, 1.6, 58], [-2, 9, 0], 6, 0, 'power2.inOut')
      .fov(50, 5, 0)
      .drone(55, 0.05, 16, 0.5)
      .caption('[a low hum]', 0.8, 4);
  }, 15);

  k.stop('Meanwhile, at Mr. Wade’s', {
    text: 'The bells were quiet. The parties weren’t. Wade’s receptions had up to 600 guests, with orchestras and military bands.',
  }, (s) => {
    // push toward the villa: light at the openings only, nothing inside is modelled
    s.fov(50, 1, 0)
      .shot([-21, 1.7, -24], [wade.x, 6, wade.z], 9, 0, 'power2.inOut')
      .glow('wade-sr', 1, 3, 1.5, { flicker: 1 })
      .bed('band-far', 0.7, 2, 1, { lowpass: 650 })
      .caption('[a band, muffled through glass]', 2, 5);
  }, 11);

  k.stop('August 1890', {
    text: 'Jeptha Wade died on 9 August 1890. His will ordered his house torn down. The bells rang again.',
    archive: [{ label: 'The empty Wade corner with one pier, 1895', id: 'CPL p4014coll18:61' }],
  }, (s) => {
    // time jumps: night lifts, the band stops, the Everett house has gone up across Case Avenue
    s.bed('band-far', 0, 1.5, 0)
      .glow('wade-sr', 0, 1.5, 0)
      .night(0, 3, 0.5)
      .gone('everett', 0, 0.01, 0.5)
      .shot([-18, 1.6, -22], [wade.x, 5, wade.z], 4, 0)
      .duck(0.8, 3, 0.5)
      .quiet(false, 3)
      .caption('[the house is taken down]', 3.5, 3)
      .sound('ui-sketch', { gain: 0.4 }, 3.5)
      .gone('wade-sr', 0.5, 3, 3.5)
      .sound('ui-erase', { gain: 0.35 }, 7.5)
      .gone('wade-sr', 1, 3.5, 7.5)
      // the bells return: softer than in 1876, then fuller
      .bed('bells-peal', 0.3, 1.5, 9.5, { lowpass: 1600 })
      .caption('[the bells, softer]', 9.5, 3.5)
      .bed('bells-peal', 0.85, 5, 13)
      .caption('[the bells, fuller]', 13, 4);
  }, 17);

  k.stop('The tower outlasts everyone', {
    text: 'In 1925 the parish left for the Heights. The corner had gone to “hotels and rooming houses.” Since 1931 the church has been St. Paul Shrine. The tower is still here.',
    archive: [{ label: 'St. Paul’s today', id: 'Dutka, Images of America (2019) ch. 4 fig. 47' }],
  }, (s) => {
    // crane up the tower, rising back over the north side's street trees (the lawn elms crowd the
    // tower close to); the street beneath fades toward later decades
    s.shot([8, 4, -16], TOWER, 3, 0, 'power1.in')
      .shot([10, 18, -38], [15.8, 19, 17.7], 10, 2.5, 'power2.out')
      .fov(45, 10, 2.5)
      .bed('bells-peal', 0, 6, 2)
      .evidence(0.85, 8, 3)
      .gone('wade-randall', 1, 4, 4)
      .gone('everett', 1, 4, 6)
      .gone('rockefeller', 1, 4, 8)
      .caption('[the bells fade]', 3, 4);
  }, 14);

  return k.finish('St. Paul Shrine, E. 40th and Euclid. Go listen.', 'street', 2);
}
