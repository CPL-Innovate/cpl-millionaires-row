import type { Kit } from './kit';
import { silentBells } from './silentBells';
import { vanished } from './vanished';
import { fourCorners } from './fourCorners';
import { misfire } from './misfire';
import { litByWind } from './litByWind';
import { theLine } from './theLine';
import { listen } from './listen';
import { afterlives } from './afterlives';
import { followTheMoney } from './followTheMoney';

// The menu (content/2026-10-14-threads-scripts, "The menu"): label, hover line, runtime. Each
// thread is its own hand-choreographed file.
export interface ThreadDef {
  id: string;
  label: string;
  hover: string;
  runtime: string;
  build: () => Kit;
}

export const THREADS: ThreadDef[] = [
  { id: 'vanished', label: 'Vanished', hover: 'A century of mansions, built and torn down in two minutes.', runtime: '2:00', build: vanished },
  { id: 'silent-bells', label: 'The Silent Bells', hover: 'A church tower that kept quiet for fourteen years.', runtime: '1:30', build: silentBells },
  { id: 'the-line', label: 'The Line', hover: 'Where the public stopped, and who was kept out.', runtime: '1:45', build: theLine },
  { id: 'lit-by-wind', label: 'Lit by Wind', hover: 'The first house in Cleveland with its own electricity.', runtime: '1:30', build: litByWind },
  { id: 'misfire', label: 'The Misfire', hover: 'A ruined banker, a pistol, and a wedding.', runtime: '1:15', build: misfire },
  { id: 'follow-the-money', label: 'Follow the Money', hover: 'Oil, iron and a bank collapse built this corner. Taxes emptied it.', runtime: '1:45', build: followTheMoney },
  { id: 'afterlives', label: 'Afterlives', hover: 'Golf on the lawn, rock ’n’ roll at the Arena, a cure for drink.', runtime: '1:45', build: afterlives },
  { id: 'listen', label: 'Listen', hover: 'Close your eyes. Euclid Avenue, 1888, by ear.', runtime: '1:45', build: listen },
  { id: 'four-corners', label: 'Four Corners', hover: 'One patriarch, three corners, and a church that kept quiet for him.', runtime: '1:30', build: fourCorners },
];
