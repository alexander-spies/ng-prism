import { controls } from './controls.ts';
import { endcard } from './endcard.ts';
import { quality } from './quality.ts';
import { reveal } from './reveal.ts';
import type { Shot } from './shot.ts';
import { states } from './states.ts';

export const SHOTS: readonly Shot[] = [reveal, controls, quality, states, endcard];

export function shotById(id: string): Shot {
    const shot = SHOTS.find((candidate) => candidate.id === id);
    if (!shot) throw new Error(`Unknown shot "${id}"`);
    return shot;
}
