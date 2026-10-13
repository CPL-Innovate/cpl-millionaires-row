// The E. 40th intersection, c. October 1888.
// World frame: metres, x = east, z = south (north is −z), origin = Euclid × Case centreline crossing.
// Positions are read off 1881 Hopkins Plates 3 + 5, each affinely fitted to a straight-street
// frame from four street control points (0.41 m/px, ±5 m) — not a survey-grade georeference. Replace with everett-evidence.json-style manifests as they fill in.

export type Provenance = 'photographed' | 'inferred' | 'invented';

export const PLATE = {
  url: '/plates/euclid-case-1881.jpg',
  widthPx: 2000,
  heightPx: 1400,
  metresPerPx: 0.41,
};

export const plateToWorld = (px: number, py: number): [number, number] => [
  (px - PLATE.widthPx / 2) * PLATE.metresPerPx,
  (py - PLATE.heightPx / 2) * PLATE.metresPerPx,
];

// The composite is georeferenced so Euclid is straight (z = 0) and Case runs N–S (x = 0).
export const euclidCentreZ = (_x: number) => 0;
export const EUCLID = { roadHalf: 9, rowHalf: 15 }; // 60-ft roadway inside a 99-ft right-of-way
export const CASE = { roadHalf: 6, rowHalf: 10 };

export interface Source {
  label: string;
  id?: string; // ContentDM pointer
}

export type MassingKind = 'villa' | 'mansard' | 'romanesque' | 'church';

export interface Building {
  id: string;
  name: string;
  short: string; // map label
  address: string;
  owner1888: string;
  plateLabel: string; // name as written on the 1881 plate
  plate: [number, number]; // footprint centre in plate px
  kind: MassingKind | 'mesh';
  size: [number, number, number]; // width (x), height to eaves, depth (z)
  rotation?: number;
  status: string;
  ledger: { surface: string; state: Provenance; basis: string }[];
  sources: Source[];
}

export const BUILDINGS: Building[] = [
  {
    id: 'everett',
    short: 'Everett',
    name: 'Everett House',
    address: '4111 Euclid (NE corner)',
    owner1888: 'Sylvester T. Everett',
    plateLabel: 'C. C. Atwood (pre-Everett lot)',
    plate: [1072, 596],
    kind: 'mesh',
    size: [32, 25, 19],
    status: 'Demolished 1938',
    ledger: [
      { surface: 'South front', state: 'photographed', basis: 'CPL 62, 63 — Tripo A1 from cleaned 62' },
      { surface: 'West side (porte-cochère)', state: 'photographed', basis: 'CPL 63, 64/56, 65, 59' },
      { surface: 'Roof', state: 'inferred', basis: 'Visible in 62/63; form only' },
      { surface: 'North + east', state: 'invented', basis: 'No photograph exists — model copied the front' },
    ],
    sources: [
      { label: 'Everett residence, oblique from SW, c. 1886', id: 'p4014coll14:63' },
      { label: 'Everett residence, front, c. 1886', id: 'p4014coll14:62' },
    ],
  },
  {
    id: 'wade-sr',
    short: 'J. H. Wade',
    name: 'Jeptha H. Wade Sr. villa',
    address: '3917 Euclid (NW corner)',
    owner1888: 'Jeptha H. Wade Sr.',
    plateLabel: 'J. H. Wade',
    plate: [911, 468],
    kind: 'villa',
    size: [18, 9.5, 20],
    status: 'Torn down 1890 by his will',
    ledger: [
      { surface: 'Footprint', state: 'inferred', basis: '1881 Hopkins Plate 3, lot 94' },
      { surface: 'Massing + cupola', state: 'inferred', basis: 'Sweeny stereograph CPL 8106 (S-SE ¾)' },
      { surface: 'Rear', state: 'invented', basis: 'Typology fill' },
    ],
    sources: [{ label: 'J. H. Wade residence, stereograph (Sweeny)', id: 'p4014coll18:8106' }],
  },
  {
    id: 'wade-randall',
    short: 'R. P. Wade',
    name: 'Randall P. Wade house',
    address: '3903 Euclid',
    owner1888: 'Jeptha H. Wade Jr. (Randall d. 1876)',
    plateLabel: 'Mrs. R. P. Wade',
    plate: [801, 477],
    kind: 'villa',
    size: [17, 9, 19],
    status: 'Razed 1934',
    ledger: [
      { surface: 'Footprint', state: 'inferred', basis: '1881 Plate 3; 1912 Sanborn 96 (stone)' },
      { surface: 'Massing', state: 'inferred', basis: 'Twin of the Wade Sr. villa (shared drive)' },
    ],
    sources: [{ label: 'Randall Wade residence', id: 'p4014coll18:8124' }],
  },
  {
    id: 'stager-beckwith',
    short: 'Stager–Beckwith',
    name: 'Stager–Beckwith house',
    address: '3813 Euclid',
    owner1888: 'T. S. Beckwith estate',
    plateLabel: 'Beckwith Est.',
    plate: [664, 458],
    kind: 'villa',
    size: [19, 10, 20],
    status: 'Survives — the calibration building',
    ledger: [
      { surface: 'Footprint', state: 'inferred', basis: '1881 Plate 3; 1912 Sanborn 96' },
      { surface: 'Massing', state: 'inferred', basis: 'Survives — measurable in person (not yet done)' },
    ],
    sources: [{ label: 'Stager-Beckwith house (modern)', id: 'p4014coll18:12361' }],
  },
  {
    id: 'brush',
    short: 'Brush',
    name: 'Charles F. Brush house',
    address: '3725 Euclid',
    owner1888: 'Charles F. Brush',
    plateLabel: 'T. R. Scowden + H. Flagler',
    plate: [561, 466],
    kind: 'romanesque',
    size: [22, 13, 24],
    status: 'Razed 1929 by his will',
    ledger: [
      { surface: 'Position', state: 'inferred', basis: 'Scowden half of the combined lot (plates README overlay)' },
      { surface: 'Massing', state: 'inferred', basis: 'Book plates M ch15-3, G ch01-23 (originals not yet obtained)' },
    ],
    sources: [{ label: 'Brush mansion — Dutka, Misfortune (2015) ch. 15, credited CPL Photograph Coll.' }],
  },
  {
    id: 'rockefeller',
    short: 'Rockefeller',
    name: 'Rockefeller house',
    address: '3920 Euclid (SW corner)',
    owner1888: 'John D. Rockefeller (in New York; kept with caretakers)',
    plateLabel: 'L. C. Rockefeller',
    plate: [851, 850],
    kind: 'mansard',
    size: [15, 9, 18],
    status: 'Demolished 1938',
    ledger: [
      { surface: 'Footprint', state: 'inferred', basis: '1881 Hopkins Plate 5' },
      { surface: 'Mansard massing', state: 'inferred', basis: 'CPL 3475 (E-SE ¾)' },
      { surface: 'West + rear', state: 'invented', basis: 'Typology fill' },
    ],
    sources: [{ label: 'Rockefeller residence, ¾ from E-SE', id: 'p4014coll18:3475' }],
  },
  {
    id: 'st-pauls',
    short: 'St. Paul’s',
    name: 'St. Paul’s Episcopal',
    address: 'SE corner, Euclid & Case',
    owner1888: 'Parish of St. Paul’s',
    plateLabel: 'St. Paul’s Epis. Ch.',
    plate: [1064, 781],
    kind: 'church',
    size: [16, 11, 32],
    status: 'Survives (converted 2021)',
    ledger: [
      { surface: 'Footprint', state: 'inferred', basis: '1881 Plate 5; 1912 Sanborn 26' },
      { surface: 'Tower + nave', state: 'inferred', basis: 'Liebich stereograph CPL 9222' },
    ],
    sources: [{ label: 'St. Paul’s, Liebich stereograph', id: 'p4014coll18:9222' }],
  },
];

export interface Station {
  id: string;
  title: string;
  caption: string;
  position: [number, number, number];
  target: [number, number, number];
  photo?: { url: string; id: string; label: string; aspect: number };
}

// Camera positions are eyeballed to approximate each photograph’s view. fSpy solves replace these.
export const STATIONS: Station[] = [
  {
    id: 'corner',
    title: 'Euclid & Case',
    caption: 'All four corners stand together only from 1887 to 1890.',
    position: [-26, 1.7, 1],
    target: [20, 7, -28],
  },
  {
    id: 'everett',
    title: 'Everett, from the SW lawn',
    caption: 'CPL 63 — the oblique the spike scores against. Camera position approximate.',
    position: [-10, 1.6, -12],
    target: [28, 10, -42],
    photo: { url: '/img/everett-63.jpg', id: 'p4014coll14:63', label: 'Everett residence, c. 1886', aspect: 1393 / 1062 },
  },
  {
    id: 'everett-ne',
    title: 'Everett, from the NE',
    caption: 'No photograph of this side exists. What you see here is the model’s invention — strip it with the Evidence slider.',
    position: [62, 1.7, -84],
    target: [28, 8, -42],
  },
  {
    id: 'wade',
    title: 'Wade villa, up the drive',
    caption: 'Sweeny stereograph — the corner house that had to die.',
    position: [-29, 1.6, -62],
    target: [-40, 6, -96],
    photo: { url: '/img/wade-8106.jpg', id: 'p4014coll18:8106', label: 'J. H. Wade residence (Sweeny stereograph)', aspect: 550 / 530 },
  },
  {
    id: 'rockefeller',
    title: 'Rockefeller, from the E-SE',
    caption: 'The smallest house on the biggest lot at the intersection.',
    position: [-33, 1.6, 30],
    target: [-60, 7, 64],
    photo: { url: '/img/rockefeller-3475.jpg', id: 'p4014coll18:3475', label: 'Rockefeller residence', aspect: 1393 / 985 },
  },
  {
    id: 'st-pauls',
    title: 'St. Paul’s, across Euclid',
    caption: 'The bells are up — and silent until 1890.',
    position: [-1, 1.6, -14],
    target: [25, 12, 31],
    photo: { url: '/img/st-pauls-9222.jpg', id: 'p4014coll18:9222', label: 'St. Paul’s (Liebich stereograph)', aspect: 565 / 657 },
  },
  {
    id: 'brush',
    title: 'Brush’s windmill',
    caption: 'The one moving thing in the 1888 scene.',
    position: [-175, 1.7, 9],
    target: [-210, 15, -134],
  },
];

export interface Beat {
  id: string;
  title: string;
  year: string;
  text: string;
  source: string;
  position: [number, number, number];
  lore?: boolean;
}

export const BEATS: Beat[] = [
  {
    id: 'misfire',
    title: 'The misfire',
    year: '10 Nov 1884',
    text: 'Horace Weddell, ruined by the Everett brothers’ bank failure, jumps from his carriage outside the half-built house and pulls the trigger. The pistol fails. A streetcar conductor helps disarm him.',
    source: 'Dutka, Misfortune (2015) ch. 11',
    position: [9, 2.2, -28],
  },
  {
    id: 'sleigh',
    title: 'The starting line',
    year: '1875–1905',
    text: 'Winter afternoons, red flags closed Euclid at E. 40th and fifty to eighty sleighs raced west from this corner — Wade’s Russian cutter among them.',
    source: 'Ruminski & Dutka, Gilded Age (2012) ch. 1',
    position: [-4, 2.2, -2],
  },
  {
    id: 'logs',
    title: 'The house on greased logs',
    year: 'c. 1869',
    text: 'Rockefeller bought the Burgert corner lot and had the house moved down Case Avenue on greased logs, half an inch at a time, to Prospect.',
    source: 'Wilson, Famous Old Euclid Avenue II pp. 175–177',
    position: [-3, 2.2, 42],
  },
  {
    id: 'bells',
    title: 'The silent bells',
    year: '1874–1890',
    text: 'St. Paul’s agreed to still its bells for the lifetime of the old man across the avenue. In 1888 the tower stands — quiet.',
    source: 'Wilson II p. 81; Gilded Age ch. 1',
    position: [12, 26, 16],
  },
  {
    id: 'fence',
    title: 'Seven thousand dollars of fence',
    year: '1866–1890',
    text: 'A boy counting the Wade gate piers: “each cost $1,000 … Seven thousand dollars. My! That would build a house.” One pier survives in CPL photo 61 (1895).',
    source: 'Wilson II p. 73; CPL p4014coll18:61',
    position: [-30, 2.2, -19],
  },
  {
    id: 'windmill',
    title: 'The windmill',
    year: '1888',
    text: 'An 80,000-lb wind dynamo, 56 ft across and 60 ft tall, behind Brush’s outbuildings — charging the batteries of the first house in Cleveland lit by its own electricity.',
    source: 'Dutka, Misfortune ch. 15; ECH',
    position: [-207, 28, -132],
  },
];
