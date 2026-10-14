import type { Kit } from './kit';
import { silentBells } from './silentBells';
import { vanished } from './vanished';

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
];
