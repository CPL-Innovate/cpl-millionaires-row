// Written by the carriages (scene/Carriages.tsx), read by the audio director: where each one is on
// Euclid, so its sound passes when it does.
export type Carriage = { x: number; z: number; dir: number; speed: number; lastPass: number };
export const traffic: Carriage[] = [];

if (import.meta.env.DEV) (window as unknown as { __traffic: Carriage[] }).__traffic = traffic;
