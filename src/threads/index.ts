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
import { whosMissing } from './whosMissing';
import { startingLine } from './startingLine';

// The menu (content/2026-10-14-threads-scripts, "The menu"): label, hover line, and the runtime as
// built (measured, not the script's estimate). Each thread is its own hand-choreographed file.
export interface ThreadDef {
  id: string;
  label: string;
  hover: string;
  runtime: string;
  build: () => Kit;
}

export const THREADS: ThreadDef[] = [
  { id: 'vanished', label: 'Vanished', hover: 'A century of mansions, built and torn down in two minutes.', runtime: '1:56', build: vanished },
  { id: 'silent-bells', label: 'The Silent Bells', hover: 'A church tower that kept quiet for fourteen years.', runtime: '1:25', build: silentBells },
  { id: 'the-line', label: 'The Line', hover: 'Where the public stopped, and who was kept out.', runtime: '1:50', build: theLine },
  { id: 'lit-by-wind', label: 'Lit by Wind', hover: 'The first house in Cleveland with its own electricity.', runtime: '1:35', build: litByWind },
  { id: 'misfire', label: 'The Misfire', hover: 'A ruined banker, a pistol, and a wedding.', runtime: '1:05', build: misfire },
  { id: 'follow-the-money', label: 'Follow the Money', hover: 'Oil, iron and a bank collapse built this corner. Taxes emptied it.', runtime: '1:40', build: followTheMoney },
  { id: 'afterlives', label: 'Afterlives', hover: 'Golf on the lawn, rock ’n’ roll at the Arena, a cure for drink.', runtime: '1:35', build: afterlives },
  { id: 'whos-missing', label: 'Who’s Missing', hover: 'The people the cameras never pointed at.', runtime: '1:25', build: whosMissing },
  { id: 'starting-line', label: 'The Starting Line', hover: 'Fifty sleighs, red flags, thirty miles an hour.', runtime: '1:10', build: startingLine },
  { id: 'listen', label: 'Listen', hover: 'Close your eyes. Euclid Avenue, 1888, by ear.', runtime: '2:15', build: listen },
  { id: 'four-corners', label: 'Four Corners', hover: 'One patriarch, three corners, and a church that kept quiet for him.', runtime: '1:55', build: fourCorners },
];
