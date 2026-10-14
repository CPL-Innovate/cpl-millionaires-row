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

// Per-face provenance for an image-to-3D mesh, in the model's own space (front = +z, as Tripo
// exports it; x and z in model units). Faces are sorted by their normal: roof (up), front, the two
// sides, and everything else (rear). The cut-offs mark where the evidence stops on a face.
export interface MeshProvenance {
  front: Provenance;
  sideNegX: Provenance; // the side on the left when you face the front
  sidePosX: Provenance;
  roof: Provenance;
  rear: Provenance;
  frontInventedPastX?: number; // front faces beyond this x are invented (hidden in the source photo)
  inventedBehindZ?: number; // everything behind this z is invented (e.g. a wing GPT made up)
}

export interface MeshModel {
  url: string;
  scale: number; // metres per model unit, from the footprint (the model has no real scale)
  rotation?: number; // about y; 0 when the model's front (+z) faces south
  provenance: MeshProvenance;
  note: string; // shown on the card: what this mesh is, and what it is not
  looks?: { map: string; normalMap: string }; // 2k maps for the Watercolour and Texture looks (scripts/house-maps.mjs)
  neutralWalls?: boolean; // wall material unknown: the watercolour keeps the walls grey, not palette earth
}

export interface Building {
  id: string;
  name: string;
  short: string; // map label
  address: string;
  owner1888: string;
  plateLabel: string; // name as written on the 1881 plate
  plate: [number, number]; // footprint centre in plate px (for a mesh: the model's origin)
  kind: MassingKind | 'mesh';
  size: [number, number, number]; // width (x), height to eaves, depth (z)
  rotation?: number;
  model?: MeshModel;
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
    model: {
      url: '/models/everett.glb',
      scale: 32 / 0.979,
      provenance: { front: 'photographed', sideNegX: 'photographed', sidePosX: 'invented', roof: 'inferred', rear: 'invented' },
      note: 'Mesh: Tripo image-to-3D spike A1 (provisional score 50–54/100), not a reconstruction.',
      looks: { map: '/models/everett-basecolor.jpg', normalMap: '/models/everett-normal.jpg' },
    },
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
    plate: [908, 490],
    kind: 'mesh',
    size: [19.9, 17.1, 19.1],
    model: {
      url: '/models/wade-sr.glb',
      // body ~0.87 units ↔ 17.7 m main block on 1881 Plate 3 (no Sanborn: razed 1890)
      scale: 20.3,
      provenance: {
        front: 'photographed', sideNegX: 'inferred', sidePosX: 'inferred', roof: 'inferred', rear: 'invented',
        frontInventedPastX: 0.14, // the 4th and 5th bays and the veranda end, hidden by trees in 8106
      },
      note: 'Mesh: Tripo image-to-3D spike W1, unscored, not a reconstruction. The façade came out flat; 8106 shows a break in it.',
      looks: { map: '/models/wade-sr-basecolor.jpg', normalMap: '/models/wade-sr-normal.jpg' },
      neutralWalls: true,
    },
    status: 'Torn down 1890 by his will',
    ledger: [
      { surface: 'South front, west three bays', state: 'photographed', basis: 'CPL 8106 (Sweeny stereo, ¾) → GPT clean → Tripo W1' },
      { surface: 'Front, east end + veranda end', state: 'invented', basis: 'Hidden by trees in 8106' },
      { surface: 'Sides', state: 'inferred', basis: 'One is seen at ¾ in 8106; which one is unverified' },
      { surface: 'Massing', state: 'inferred', basis: 'Front drawn flat; model is ~60% of the 1881 plate’s depth; IoA ch04-48 lithograph' },
      { surface: 'Rear', state: 'invented', basis: 'Tripo copied the front' },
      { surface: 'Walls', state: 'inferred', basis: 'Material unknown; kept neutral' },
    ],
    sources: [
      { label: 'J. H. Wade residence, stereograph (Sweeny)', id: 'p4014coll18:8106' },
      { label: 'Wade estate lithograph — Dutka, Images of America (2019) ch. 4 fig. 48, credited CPL' },
    ],
  },
  {
    id: 'wade-randall',
    short: 'R. P. Wade',
    name: 'Randall P. Wade house',
    address: '3903 Euclid',
    owner1888: 'Jeptha H. Wade Jr. (Randall d. 1876)',
    plateLabel: 'Mrs. R. P. Wade',
    // front wall on 1912 Sanborn 96's front edge (62 m back from the Euclid line), centred on the
    // main block; the 1881 plate's footprint sits ~2 m further south and ~3 m east (inside ±5 m)
    plate: [795, 499],
    kind: 'mesh',
    size: [20.6, 16.3, 19.8],
    model: {
      url: '/models/wade-randall.glb',
      // front block 0.77 units ↔ 53 ft (16.1 m) on 1912 Sanborn 96, without the later rear additions and
      // the garage; its cornice then lands within half a metre of the twin Wade Sr. villa's eaves
      scale: 21,
      provenance: {
        front: 'photographed', sideNegX: 'photographed', sidePosX: 'invented', roof: 'inferred', rear: 'invented',
        frontInventedPastX: 0.38, // the east end: hidden behind a neighbouring building in 8140; Tripo mirrored the west wing here
      },
      note: 'Mesh: Tripo image-to-3D spike RW1, unscored, not a reconstruction. Tripo mirrored the west wing onto the east end.',
      looks: { map: '/models/wade-randall-basecolor.jpg', normalMap: '/models/wade-randall-normal.jpg' },
    },
    status: 'Razed 1934',
    ledger: [
      { surface: 'South front', state: 'photographed', basis: 'CPL 8140 (Ryder stereograph, 1883) → GPT clean → Tripo RW1; statues and double stairs confirmed in 8124' },
      { surface: 'Front door, crest, frieze panels', state: 'invented', basis: 'Dark or blurred in 8140; GPT drew them crisp and symmetrical' },
      { surface: 'West side wing', state: 'photographed', basis: 'The strip seen in 8140' },
      { surface: 'East end + return', state: 'invented', basis: 'Hidden by a neighbouring building in 8140' },
      { surface: 'Roof', state: 'inferred', basis: 'Belvedere seen in 8140; behind it invented' },
      { surface: 'Rear', state: 'invented', basis: 'Tripo copied the front' },
      { surface: 'Walls', state: 'inferred', basis: 'Sandstone is documented (Akron quarry); the colour is not' },
      { surface: 'Scale', state: 'inferred', basis: '1912 Sanborn 96 (stone dwelling, minus the additions and garage); model is ~55% of the main block’s depth' },
    ],
    sources: [
      { label: 'Randall Wade residence, stereograph (Ryder), 1883', id: 'p4014coll18:8140' },
      { label: 'Randall Wade residence, portico', id: 'p4014coll18:8124' },
    ],
  },
  {
    id: 'stager-beckwith',
    short: 'Stager–Beckwith',
    name: 'Stager–Beckwith house',
    address: '3813 Euclid',
    owner1888: 'T. S. Beckwith estate',
    plateLabel: 'Beckwith Est.',
    plate: [668, 470],
    kind: 'mesh',
    size: [22.4, 15, 14.5],
    model: {
      url: '/models/stager-beckwith.glb',
      // house without the veranda ~0.82 units ↔ 61 ft (18.7 m) on 1912 Sanborn 96; its 38 ft height then matches
      scale: 22.8,
      provenance: { front: 'photographed', sideNegX: 'invented', sidePosX: 'invented', roof: 'inferred', rear: 'invented' },
      note: 'Mesh: Tripo image-to-3D spike S1, unscored, not a reconstruction.',
      looks: { map: '/models/stager-beckwith-basecolor.jpg', normalMap: '/models/stager-beckwith-normal.jpg' },
    },
    status: 'Survives — the calibration building',
    ledger: [
      { surface: 'South front + east veranda', state: 'photographed', basis: 'Early-20th-c. photo (WRHS; rights to confirm) → GPT clean → Tripo S1. Porch under the tower invented' },
      { surface: 'Sides + rear', state: 'invented', basis: 'No period photograph; Tripo copied the front' },
      { surface: 'Roof', state: 'inferred', basis: 'Mansard and tower cap from the front; IoA ch04-40 lithograph' },
      { surface: 'Scale', state: 'inferred', basis: '1912 Sanborn 96: main block 61 ft, 38 ft high' },
    ],
    sources: [
      { label: 'Stager-Beckwith house (modern)', id: 'p4014coll18:12361' },
      { label: 'Front, early 20th c. — Cleveland Children’s Museum / WRHS (rights to confirm)' },
    ],
  },
  {
    id: 'brush',
    short: 'Brush',
    name: 'Charles F. Brush house',
    address: '3725 Euclid',
    owner1888: 'Charles F. Brush',
    plateLabel: 'T. R. Scowden + H. Flagler',
    // front wall on 1912 Sanborn 96's front edge (61 m back from the Euclid line), centred on the
    // main block in the east (Scowden) half of 3725: ~17 m west of the old massing guess
    plate: [520, 493],
    kind: 'mesh',
    size: [26, 20.4, 19.7],
    model: {
      url: '/models/brush.glb',
      // two-gabled front block 0.66 units ↔ 57 ft (17.5 m) front wall on 1912 Sanborn 96; then 20 m
      // high, ~1.4× Stager-Beckwith's tower (M ch15-5 reads ~1.5×). Fitting the whole 0.98-unit
      // width to the footprint instead would make it 16.6 m, too low for three storeys and pavilions
      scale: 26.5,
      provenance: { front: 'photographed', sideNegX: 'inferred', sidePosX: 'invented', roof: 'inferred', rear: 'invented' },
      note: 'Mesh: Tripo image-to-3D spike B1 from a 600-px book halftone. AI-touched; placeholder until it is re-run from the CPL print.',
      looks: { map: '/models/brush-basecolor.jpg', normalMap: '/models/brush-normal.jpg' },
    },
    status: 'Razed 1929 by his will',
    ledger: [
      { surface: 'South front', state: 'photographed', basis: 'Book reproduction (Dutka, Misfortune ch. 15 fig. 3, credited CPL) → GPT clean → Tripo B1. Mass and silhouette only' },
      { surface: 'Carving, capitals, mouldings', state: 'invented', basis: 'GPT’s, drawn crisp from a halftone blur' },
      { surface: 'West end bay', state: 'invented', basis: 'The source shows a chimney and a shadowed edge' },
      { surface: 'Tower base + wing under it', state: 'invented', basis: 'Cut by the frame and foliage in the source' },
      { surface: 'West return', state: 'inferred', basis: 'Seen in G ch01-23 (not a model input)' },
      { surface: 'East + north', state: 'invented', basis: 'No photograph used' },
      { surface: 'Walls', state: 'inferred', basis: 'Grey stone from the Sanborn colour code only' },
      { surface: 'Scale', state: 'inferred', basis: '1912 Sanborn 96, east half of 3725; model is ~65% of the main block’s depth' },
    ],
    sources: [{ label: 'Brush mansion — Dutka, Misfortune (2015) ch. 15, credited CPL Photograph Coll. AI-touched; placeholder' }],
  },
  {
    id: 'rockefeller',
    short: 'Rockefeller',
    name: 'Rockefeller house',
    address: '3920 Euclid (SW corner)',
    owner1888: 'John D. Rockefeller (in New York; kept with caretakers)',
    plateLabel: 'L. C. Rockefeller',
    plate: [853, 853],
    kind: 'mesh',
    size: [15.3, 14, 29.8],
    model: {
      url: '/models/rockefeller.glb',
      // main block 0.45 units ↔ 45 ft (13.7 m) front on 1912 Sanborn 26
      scale: 30.4,
      rotation: Math.PI, // faces north, onto Euclid
      provenance: {
        front: 'photographed', sideNegX: 'photographed', sidePosX: 'invented', roof: 'inferred', rear: 'invented',
        inventedBehindZ: 0.15, // the main block's corner: GPT invented the long wing behind it
      },
      note: 'Mesh: Tripo image-to-3D spike R1, unscored, not a reconstruction. The camera orientation of 3475 is a hypothesis.',
      looks: { map: '/models/rockefeller-basecolor.jpg', normalMap: '/models/rockefeller-normal.jpg' },
    },
    status: 'Demolished 1938',
    ledger: [
      { surface: 'North front', state: 'photographed', basis: 'CPL 3475 (¾) → GPT clean → Tripo R1' },
      { surface: 'Case Ave side, main block', state: 'photographed', basis: '3475, oblique; camera from the NE is a hypothesis' },
      { surface: 'Wing behind the main block', state: 'invented', basis: 'Made up by GPT. 1912 Sanborn 26 does show a 2½-storey rear wing, but not this one' },
      { surface: 'West + rear', state: 'invented', basis: 'Tripo copied the front' },
      { surface: 'Roof', state: 'inferred', basis: 'Mansard visible in 3475' },
      { surface: 'Scale', state: 'inferred', basis: '1912 Sanborn 26: main block 45 ft square' },
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
    // north wall on 1912 Sanborn 26's front edge (4 m in from the Euclid line), centred on the north
    // front, chapel to tower; the 1881 Plate 5 footprint agrees within ±5 m
    plate: [1069, 776],
    kind: 'mesh',
    size: [35.3, 23.9, 29.9],
    model: {
      url: '/models/st-pauls.glb',
      // north front, chapel to tower, 0.97 units ↔ 115 ft (35.1 m) on 1912 Sanborn 26; then the tower
      // is 23.8 m (Sanborn: 75 ft, 22.9 m) and the nave eaves 7.2 m (Sanborn: 24 ft, 7.3 m)
      scale: 36.1,
      rotation: Math.PI, // the model's front is the Euclid gable: faces north; its +x side is E. 40th
      provenance: { front: 'photographed', sideNegX: 'invented', sidePosX: 'invented', roof: 'inferred', rear: 'invented' },
      note: 'Mesh: Tripo image-to-3D spike P1, unscored, not a reconstruction. Tripo laid the ¾ view out flat. The church survives: its sides are invented in this model, not unknown.',
      looks: { map: '/models/st-pauls-basecolor.jpg', normalMap: '/models/st-pauls-normal.jpg' },
    },
    status: 'Survives (converted 2021)',
    ledger: [
      { surface: 'Euclid gable, tower, E. 40th range', state: 'photographed', basis: 'CPL 9222 (Liebich stereograph, ¾) → GPT clean → Tripo P1; drawn as one flat front' },
      { surface: 'Tower top detail', state: 'invented', basis: 'Silhouette photographed; spirelet and pinnacle detail behind branches in 9222' },
      { surface: 'East chapel and its spire', state: 'invented', basis: 'Mostly behind trees in 9222; past its silhouette, GPT’s' },
      { surface: 'Main-gable porch', state: 'invented', basis: 'Behind the lamp post and a tree in 9222' },
      { surface: 'Sides + rear', state: 'invented', basis: 'Invented in this model only: the building stands and can be photographed (CPL 2021 series)' },
      { surface: 'Walls', state: 'inferred', basis: 'Sandstone; the colour reads too yellow and can be checked on site' },
      { surface: 'Scale', state: 'inferred', basis: '1912 Sanborn 26 (tower 75 ft, eaves 24 ft); model is ~75% of the church’s depth' },
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
  // fit: where the print sits in the frame, matched by eye to the drawing: its height as a fraction
  // of the frame's (default 0.78) and an offset of its centre in frame heights (+x right, +y up)
  photo?: { url: string; id: string; label: string; aspect: number; fit?: { scale?: number; shift?: [number, number] } };
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
    caption: 'CPL 63 — the oblique the spike scores against. Camera registered to the photograph.',
    // registered to the photograph by its skyline (tower, roofs) and base: the camera stood on Euclid
    position: [10.48, 1.6, -1.82],
    target: [23.44, 11.62, -44.91],
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
    // registered to the stereograph by its skyline (roof, belvedere): south-west of the house, up the drive
    position: [-56.2, 1.6, -51.96],
    target: [-37.7, 3.37, -84.0],
    photo: { url: '/img/wade-8106.jpg', id: 'p4014coll18:8106', label: 'J. H. Wade residence (Sweeny stereograph)', aspect: 550 / 530, fit: { scale: 0.8 } },
  },
  {
    id: 'rockefeller',
    title: 'Rockefeller, from the NE',
    caption: 'The smallest house on the biggest lot at the intersection. CPL 3475 seems taken from the NE, not the E-SE its record says: a hypothesis.',
    position: [-33, 1.6, 30],
    target: [-60, 7, 64],
    photo: { url: '/img/rockefeller-3475.jpg', id: 'p4014coll18:3475', label: 'Rockefeller residence', aspect: 1393 / 985 },
  },
  {
    id: 'stager',
    title: 'Stager–Beckwith, from Euclid',
    caption: 'The one face a photograph shows, and the house that survives: the calibration building.',
    // registered to the lawn stereoview by its skyline (tower, mansards) and the veranda arches
    position: [-134.15, 1.6, -66.37],
    target: [-136.59, 6.18, -94.26],
    photo: { url: '/img/stager-beckwith-lawn.jpg', id: 'Wilson II, p. 73', label: 'The Beckwith home, with Mrs. Beckwith and friends on the lawn (stereoview)', aspect: 665 / 541, fit: { scale: 0.83 } },
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

// Lots for the Atlas map, traced off the 1881 plate composite (plate px, ±3 px on the lines). The
// north-side lots run on past the plate's top edge; they're cut at Everett's rear line (y 205) so
// the selectors stay a readable size. Listed west → east, north side first. `owner`
// is the 1881 plate's name; `building` and `station` link a lot to what the street view has.
export interface Lot {
  id: string;
  name: string;
  owner: string;
  poly: [number, number][];
  building?: string;
  station?: string;
}

const rect = (x0: number, y0: number, x1: number, y1: number): [number, number][] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

export const LOTS: Lot[] = [
  { id: 'flagler', name: 'Flagler', owner: 'H. Flagler · later C. F. Brush', poly: rect(441, 205, 576, 662), building: 'brush', station: 'brush' },
  { id: 'beckwith', name: 'Beckwith', owner: 'Beckwith estate', poly: rect(576, 205, 750, 662), building: 'stager-beckwith', station: 'stager' },
  { id: 'rp-wade', name: 'R. P. Wade', owner: 'Mrs. R. P. Wade', poly: rect(750, 205, 856, 662), building: 'wade-randall', station: 'wade' },
  { id: 'jh-wade', name: 'J. H. Wade', owner: 'Jeptha H. Wade', poly: rect(856, 205, 977, 662), building: 'wade-sr', station: 'wade' },
  { id: 'atwood', name: 'Everett', owner: 'C. C. Atwood · later S. T. Everett', poly: rect(1022, 205, 1130, 662), building: 'everett', station: 'everett' },
  { id: 'leek', name: 'Leek', owner: 'T. W. Leek', poly: rect(728, 735, 798, 1040) },
  { id: 'rockefeller', name: 'Rockefeller', owner: 'L. C. Rockefeller', poly: rect(798, 735, 887, 1040), building: 'rockefeller', station: 'rockefeller' },
  { id: 'lot-69', name: 'Lot 69', owner: 'unbuilt in 1881', poly: rect(887, 735, 977, 1040) },
  { id: 'st-pauls', name: 'St. Paul’s', owner: 'Parish of St. Paul’s', poly: rect(1022, 735, 1102, 885), building: 'st-pauls', station: 'st-pauls' },
];
