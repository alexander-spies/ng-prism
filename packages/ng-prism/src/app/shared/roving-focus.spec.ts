import { nextRovingIndex } from './roving-focus.js';

describe('nextRovingIndex', () => {
    it.each([
        [0, 'ArrowRight', 3, 1],
        [2, 'ArrowRight', 3, 0],
        [0, 'ArrowLeft', 3, 2],
        [1, 'ArrowDown', 3, 2],
        [1, 'ArrowUp', 3, 0],
        [1, 'Home', 3, 0],
        [1, 'End', 3, 2]
    ])('moves from %i on %s among %i items to %i', (current, key, count, expected) => {
        expect(nextRovingIndex(current, key, count)).toBe(expected);
    });

    it('ignores keys that do not move focus', () => {
        expect(nextRovingIndex(1, 'Enter', 3)).toBeNull();
        expect(nextRovingIndex(1, 'a', 3)).toBeNull();
    });

    it('has nowhere to go without items', () => {
        expect(nextRovingIndex(0, 'ArrowRight', 0)).toBeNull();
    });
});
