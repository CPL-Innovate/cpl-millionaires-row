// The whole Avenue for the map threads (Vanished; the inserts in The Line and The Starting Line).
// Schematic, not to scale: houses sit at their street number along one line from Public Square to
// E. 105th, odd numbers on the north side. Rows from the mansion survey (research/2026-10-12-
// millionaires-row-mansion-survey §1 and its addendum), which is a web pass with unverified rows:
// every year here needs a check before it goes on screen (script flag). `built`/`gone` are years;
// gone: 0 = still standing, null = demolished, year unknown (it goes dark with the commerce wash).

export interface AvenueHouse {
  id: string;
  name: string;
  no: number; // street number (post-1906); approximate where the survey has only a cross street
  north: boolean;
  built: number;
  gone: number | null;
  big?: boolean; // named on the map when zoomed in
  survivor?: string; // shown on the final card
}

export const AVENUE: AvenueHouse[] = [
  // west of E. 22nd: the first generation, gone to commerce
  { id: 'dodge', name: 'Dodge', no: 900, north: true, built: 1850, gone: null },
  { id: 'witt', name: 'Witt', no: 1200, north: false, built: 1841, gone: 1912 },
  { id: 'stone', name: 'Amasa Stone', no: 1255, north: true, built: 1858, gone: 1910, big: true },
  { id: 'perkins', name: 'Perkins', no: 1500, north: true, built: 1838, gone: null },
  { id: 'andrews-s', name: 'S. Andrews', no: 1700, north: false, built: 1840, gone: null },
  { id: 'cowles', name: 'Cowles', no: 1900, north: true, built: 1845, gone: null },
  // E. 22nd – E. 30th
  { id: 'perry', name: 'Perry', no: 2105, north: true, built: 1838, gone: 1949 },
  { id: 'payne', name: 'Payne', no: 2155, north: true, built: 1849, gone: 1949, big: true },
  { id: 'howe', name: 'Howe', no: 2258, north: false, built: 1894, gone: 0, survivor: 'Howe House, 2258 Euclid (CSU)' },
  { id: 'johnson', name: 'Tom L. Johnson', no: 2343, north: true, built: 1883, gone: 1927, big: true },
  { id: 'frasch', name: 'Frasch', no: 2409, north: false, built: 1878, gone: 1927 },
  { id: 'herrick', name: 'Herrick', no: 2435, north: true, built: 1857, gone: null },
  { id: 'bingham', name: 'Bingham', no: 2445, north: true, built: 1870, gone: 1959 },
  { id: 'devereux-h', name: 'H. Devereux', no: 2525, north: true, built: 1880, gone: 1959 },
  { id: 'mather', name: 'Mather', no: 2605, north: true, built: 1910, gone: 0, big: true, survivor: 'Mather Mansion, 2605 Euclid (CSU)' },
  { id: 'hanna', name: 'Hanna', no: 2717, north: true, built: 1904, gone: 1959, big: true },
  { id: 'bulkley', name: 'Bulkley', no: 2926, north: false, built: 1883, gone: null },
  // E. 30th – E. 40th: this block
  { id: 'andrews', name: 'Andrews', no: 3033, north: true, built: 1885, gone: 1923, big: true },
  { id: 'eells', name: 'Eells', no: 3201, north: true, built: 1876, gone: 1959, big: true },
  { id: 'devereux', name: 'Devereux', no: 3226, north: false, built: 1873, gone: 0, survivor: 'Devereux house, its core inside the Fine Arts Building, 3226 Euclid' },
  { id: 'carlin', name: 'Carlin', no: 3233, north: true, built: 1912, gone: 1997 },
  { id: 'hussey', name: 'Hussey', no: 3411, north: true, built: 1871, gone: null },
  { id: 'harkness', name: 'Harkness', no: 3634, north: false, built: 1870, gone: null },
  { id: 'worthington', name: 'Worthington', no: 3717, north: true, built: 1852, gone: null },
  { id: 'brush', name: 'Brush', no: 3725, north: true, built: 1884, gone: 1929, big: true },
  { id: 'stager', name: 'Stager–Beckwith', no: 3813, north: true, built: 1866, gone: 0, big: true, survivor: 'Stager–Beckwith House, 3813 Euclid (Children’s Museum)' },
  { id: 'wade-r', name: 'R. Wade', no: 3903, north: true, built: 1866, gone: 1934 },
  { id: 'wade', name: 'Wade', no: 3917, north: true, built: 1866, gone: 1890, big: true },
  { id: 'rockefeller', name: 'Rockefeller', no: 3920, north: false, built: 1868, gone: 1938, big: true },
  { id: 'st-pauls', name: 'St. Paul’s', no: 4002, north: false, built: 1876, gone: 0, big: true, survivor: 'St. Paul Shrine, E. 40th and Euclid' },
  { id: 'everett', name: 'Everett', no: 4111, north: true, built: 1887, gone: 1938, big: true },
  // E. 55th – E. 105th: the upper Avenue
  { id: 'sackett', name: 'Sackett', no: 6700, north: false, built: 1836, gone: null },
  { id: 'dunham', name: 'Dunham Tavern', no: 6709, north: true, built: 1824, gone: 0, survivor: 'Dunham Tavern, 6709 Euclid' },
  { id: 'haydn', name: 'Haydn', no: 7119, north: true, built: 1880, gone: null },
  { id: 'bradley', name: 'Bradley', no: 7217, north: true, built: 1880, gone: null },
  { id: 'allen-sullivan', name: 'Allen–Sullivan', no: 7218, north: false, built: 1887, gone: 2021 },
  { id: 'hanna-d', name: 'D. R. Hanna', no: 7404, north: false, built: 1896, gone: null },
  { id: 'rainey', name: 'Rainey', no: 7418, north: false, built: 1880, gone: null },
  { id: 'little', name: 'Little', no: 7615, north: true, built: 1885, gone: null },
  { id: 'lewis', name: 'Lewis', no: 7706, north: false, built: 1885, gone: null },
  { id: 'thorp', name: 'Thorp', no: 7801, north: true, built: 1885, gone: null },
  { id: 'drury', name: 'Drury', no: 8615, north: true, built: 1912, gone: 0, survivor: 'Drury House, 8615 Euclid (Cleveland Clinic)' },
  { id: 'allen', name: 'Allen', no: 8811, north: true, built: 1900, gone: null },
  { id: 'treadway', name: 'Treadway', no: 8917, north: true, built: 1911, gone: 1968 },
  { id: 'white', name: 'White', no: 8937, north: true, built: 1901, gone: 0, survivor: 'White House, 8937 Euclid (Cleveland Clinic)' },
];

export const CROSS = [
  { no: 100, label: 'Public Square' },
  { no: 900, label: 'E. 9th' },
  { no: 2200, label: 'E. 22nd' },
  { no: 3000, label: 'E. 30th' },
  { no: 3960, label: 'E. 40th' },
  { no: 5500, label: 'E. 55th' },
  { no: 7100, label: 'E. 71st' },
  { no: 10500, label: 'E. 105th' },
];
export const AVENUE_END = 10500;

// what the map overlay shows; every field is tweened by a thread's timeline (seekable)
const DEFAULTS = {
  show: 0, // overlay opacity (opaque paper over the 3D scene)
  x0: -300, x1: 10900, // viewport in street numbers
  line: 0, // Euclid traced, 0 → 1
  plate: 0, // the 1881 plate, faded in under the line at E. 40th
  dots: 0, // dots appear west → east up to this street number
  year: 1830,
  showYear: 0,
  wash: 0, // commerce: a warm wash from Public Square east to this street number
  flare: '', // ids that flare (Still happening)
  focus: '', // id ringed (Demolition years)
  survivors: 0, // the survivors light up
  span: 0, // the last four families, E. 32nd – E. 38th
  names: 0, // names on the big lots
  route: 0, // The Line: the horsecar route (0 → 1 drawn)
  course: 0, // The Starting Line: the sleigh course to E. 9th
};
export type AvenueMapState = typeof DEFAULTS;
export const AVENUE_DEFAULTS: Readonly<AvenueMapState> = DEFAULTS;
export const avenueMap: AvenueMapState = { ...DEFAULTS };
const KEYS = Object.keys(DEFAULTS) as (keyof AvenueMapState)[];
// a plain copy (gsap hangs its cache on the live object)
export const avenueSnapshot = (): AvenueMapState => Object.fromEntries(KEYS.map((k) => [k, avenueMap[k]])) as AvenueMapState;
export const avenueReset = () => Object.assign(avenueMap, DEFAULTS);
