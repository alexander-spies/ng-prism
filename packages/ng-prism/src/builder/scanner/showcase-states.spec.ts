import { readShowcaseStates } from './showcase-states.js';

describe('readShowcaseStates', () => {
    const state = (name: string) => ({ name, pseudo: { hover: `.${name}` } });

    it('puts an empty slot back at each position the evaluator dropped, without a message', () => {
        const report = jest.fn();
        const states = readShowcaseStates([state('a'), state('b'), state('c')], 'Cmp', report, new Set([3, 1]));

        expect(states!.map((s) => s.name)).toEqual(['a', 'State 2', 'b', 'State 4', 'c']);
        expect(states!.map((s) => Object.keys(s.pseudo).length)).toEqual([1, 0, 1, 0, 1]);
        expect(report).not.toHaveBeenCalled();
    });

    it('keeps a single slot when the evaluator dropped the only entry', () => {
        expect(readShowcaseStates([], 'Cmp', jest.fn(), new Set([0]))).toEqual([{ name: 'State 1', pseudo: {} }]);
    });

    it('reads an empty list as no states', () => {
        const report = jest.fn();

        expect(readShowcaseStates([], 'Cmp', report)).toBeUndefined();
        expect(report).not.toHaveBeenCalled();
    });
});
