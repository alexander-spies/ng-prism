import { reveal } from './reveal.ts';
import type { Shot } from './shot.ts';

export const SHOTS: readonly Shot[] = [reveal];

export function shotById(id: string): Shot {
    const shot = SHOTS.find((candidate) => candidate.id === id);
    if (!shot) throw new Error(`Unknown shot "${id}"`);
    return shot;
}
