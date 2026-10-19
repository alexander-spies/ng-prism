import type { ShowcaseState } from '../../decorator/showcase.types.js';
import type { ForcedPseudoStates } from '../../shared/pseudo-state.type.js';
import type { StateFit } from '../pseudo/state-fit.js';
import { buildStateChips, chipFits, toggleTitle } from './state-chips.js';

const states: ShowcaseState[] = [
    { name: 'Hover', pseudo: { hover: true } },
    { name: 'Focus', pseudo: { focus: '.inner' } },
    { name: 'Pressed', pseudo: { active: true } }
];
const fit: StateFit = { fits: true };

describe('buildStateChips', () => {
    it('builds one chip per state in declaration order', () => {
        const chips = buildStateChips(states, null, [fit, fit, fit]);

        expect(chips.map((chip) => [chip.index, chip.name])).toEqual([
            [0, 'Hover'],
            [1, 'Focus'],
            [2, 'Pressed']
        ]);
    });

    it('marks the active chip', () => {
        const chips = buildStateChips(states, 1, [fit, fit, fit]);

        expect(chips.map((chip) => chip.active)).toEqual([false, true, false]);
        expect(buildStateChips(states, null, [fit, fit, fit]).some((chip) => chip.active)).toBe(false);
    });

    it('titles a chip that does not fit with its reason', () => {
        const chips = buildStateChips(states, null, [fit, { fits: false, reason: '.inner matches nothing' }, fit]);

        expect(chips[1]).toMatchObject({ fits: false, title: 'Focus does not fit this variant: .inner matches nothing' });
        expect(chips[0]).toMatchObject({ fits: true, title: 'Show Hover on this variant' });
    });

    it('titles the active chip as a way to turn it off', () => {
        const chips = buildStateChips(states, 0, [fit, fit, fit]);

        expect(chips[0].title).toBe('Hover is shown; click to turn it off');
        expect(chips[1].title).toBe('Show Focus on this variant');
    });

    it('names the reason on an active chip that is not applied', () => {
        const chips = buildStateChips(states, 1, [fit, { fits: false, reason: 'states: false' }, fit]);

        expect(chips[1]).toMatchObject({ active: true, fits: false, title: 'Focus does not fit this variant: states: false' });
    });

    it('counts a state without a fit yet as fitting', () => {
        const chips = buildStateChips(states, null, []);

        expect(chips.every((chip) => chip.fits)).toBe(true);
    });
});

describe('chipFits', () => {
    const element = {} as Element;
    const none: StateFit = { fits: false, reason: 'hover matches nothing' };

    function evaluator(results: Record<string, StateFit>) {
        return jest.fn((_root: Element, pseudo: ForcedPseudoStates) => results[Object.keys(pseudo)[0]] ?? fit);
    }

    it('evaluates every state against the rendered element', () => {
        const evaluate = evaluator({ focus: none });

        expect(chipFits(states, { element, optedOut: false, activeIndex: null, canvasFit: null }, evaluate)).toEqual([fit, none, fit]);
        expect(evaluate).toHaveBeenCalledTimes(3);
        expect(evaluate).toHaveBeenCalledWith(element, { focus: '.inner' });
    });

    it('fails every state on a variant that opted out', () => {
        const evaluate = evaluator({});
        const optedOut: StateFit = { fits: false, reason: 'states: false' };

        expect(chipFits(states, { element, optedOut: true, activeIndex: 0, canvasFit: fit }, evaluate)).toEqual([optedOut, optedOut, optedOut]);
        expect(evaluate).not.toHaveBeenCalled();
    });

    it('takes the fit of the active state from the canvas', () => {
        const evaluate = evaluator({});
        const onCanvas: StateFit = { fits: false, reason: 'hover is disabled' };

        expect(chipFits(states, { element, optedOut: false, activeIndex: 0, canvasFit: onCanvas }, evaluate)).toEqual([onCanvas, fit, fit]);
        expect(evaluate).toHaveBeenCalledTimes(2);
    });

    it('evaluates the active state itself while the canvas applies no state', () => {
        const evaluate = evaluator({ hover: none });

        expect(chipFits(states, { element, optedOut: false, activeIndex: 0, canvasFit: null }, evaluate)[0]).toEqual(none);
    });

    it('counts every state as fitting while nothing is rendered', () => {
        const evaluate = evaluator({ focus: none });

        expect(chipFits(states, { element: null, optedOut: false, activeIndex: null, canvasFit: null }, evaluate)).toEqual([fit, fit, fit]);
        expect(evaluate).not.toHaveBeenCalled();
    });
});

describe('toggleTitle', () => {
    it('offers to force a class nothing declares', () => {
        expect(toggleTitle('hover', null)).toBe('Force :hover on the whole component');
    });

    it('names the variant that declares the class', () => {
        expect(toggleTitle('hover', { by: 'variant' })).toBe(':hover is forced by this variant');
    });

    it('names the state that declares the class', () => {
        expect(toggleTitle('focus-visible', { by: 'state', name: 'Keyboard' })).toBe(':focus-visible is forced by the state "Keyboard"');
    });
});
