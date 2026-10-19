import type { ForcedPseudoStates } from '../../shared/pseudo-state.type.js';
import { forcesAnyState } from './pseudo-targets.js';

describe('forcesAnyState', () => {
    it.each<[ForcedPseudoStates | null | undefined, boolean]>([
        [undefined, false],
        [null, false],
        [{}, false],
        [{ hover: '' }, false],
        [{ hover: [] }, false],
        [{ hover: true }, true],
        [{ focus: '.a' }, true],
        [{ focus: ['', '.a'] }, true]
    ])('%j forces a state: %s', (states, expected) => {
        expect(forcesAnyState(states)).toBe(expected);
    });
});
