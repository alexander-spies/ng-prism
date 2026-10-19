import type { RuntimeComponent } from '../../plugin/plugin.types.js';
import type { ForcedPseudoStates } from '../../shared/pseudo-state.type.js';
import type { AppliedPseudoStates } from '../pseudo/pseudo-state-marker.js';
import type { StateFit } from '../pseudo/state-fit.js';
import { resolveExcludedReason, resolveRenderedKey } from './rendered-key.js';

const component = { meta: { className: 'ButtonComponent' } } as RuntimeComponent;
const element = {} as Element;

function applied(states: ForcedPseudoStates | null, state: ForcedPseudoStates | null, fit: StateFit | null = null, root: Element = element): AppliedPseudoStates {
    return { root, states, state, fit };
}

describe('resolveRenderedKey with a state', () => {
    const state = { hover: '.btn' };

    it('keeps the key without suffix when no state is active', () => {
        const key = resolveRenderedKey({ component, variantIndex: 2, stateIndex: null, element, pseudo: null, state: null, pseudoApplied: null });

        expect(key).toBe('ButtonComponent:2');
    });

    it('adds the state index once the state layer is in place', () => {
        const input = { component, variantIndex: 2, stateIndex: 1, element, pseudo: null, state };

        expect(resolveRenderedKey({ ...input, pseudoApplied: null })).toBeNull();
        expect(resolveRenderedKey({ ...input, pseudoApplied: applied(null, { hover: '.other' }) })).toBeNull();
        expect(resolveRenderedKey({ ...input, pseudoApplied: applied(null, state) })).toBe('ButtonComponent:2:1');
    });

    it('keys an opted-out variant with the state index', () => {
        const key = resolveRenderedKey({ component, variantIndex: 8, stateIndex: 1, element, pseudo: null, state: null, pseudoApplied: null });

        expect(key).toBe('ButtonComponent:8:1');
    });

    it('also waits for the state layer to lift when the base still forces something', () => {
        const pseudo = { focus: true as const };
        const input = { component, variantIndex: 8, stateIndex: 1, element, pseudo, state: null };

        // The marker still holds the previous state: the state class is on screen.
        expect(resolveRenderedKey({ ...input, pseudoApplied: applied(pseudo, state) })).toBeNull();
        expect(resolveRenderedKey({ ...input, pseudoApplied: applied(pseudo, null) })).toBe('ButtonComponent:8:1');
    });

    it('waits for an empty state layer too, so a state the scanner could not evaluate is reported', () => {
        const unusable = {};
        const input = { component, variantIndex: 0, stateIndex: 3, element, pseudo: null, state: unusable };

        expect(resolveRenderedKey({ ...input, pseudoApplied: null })).toBeNull();
        expect(resolveRenderedKey({ ...input, pseudoApplied: applied(null, unusable, { fits: false, reason: 'forces no state' }) })).toBe('ButtonComponent:0:3');
    });

    it('waits for the marker to hold this element', () => {
        const input = { component, variantIndex: 2, stateIndex: 1, element, pseudo: null, state };

        expect(resolveRenderedKey({ ...input, pseudoApplied: applied(null, state, null, {} as Element) })).toBeNull();
    });

    it('is not ready without an element or a component', () => {
        const input = { variantIndex: 2, stateIndex: 1, pseudo: null, state: null, pseudoApplied: null };

        expect(resolveRenderedKey({ ...input, component, element: null })).toBeNull();
        expect(resolveRenderedKey({ ...input, component: null, element })).toBeNull();
    });
});

describe('resolveExcludedReason', () => {
    const state = { hover: '.btn' };

    it('is null without an active state', () => {
        expect(resolveExcludedReason(null, null, null)).toBeNull();
        expect(resolveExcludedReason(null, null, applied({ hover: true }, null))).toBeNull();
    });

    it('names the opt-out of the variant', () => {
        expect(resolveExcludedReason(1, 'states: false', null)).toBe('states: false');
        expect(resolveExcludedReason(1, 'states: false', applied(null, null))).toBe('states: false');
    });

    it('gives the reason a state does not fit', () => {
        const fit = { fits: false as const, reason: '.btn is disabled' };

        expect(resolveExcludedReason(1, null, applied(null, state, fit))).toBe('.btn is disabled');
    });

    it('is null for a state that fits', () => {
        expect(resolveExcludedReason(1, null, applied(null, state, { fits: true }))).toBeNull();
    });

    it('is null while nothing is applied yet', () => {
        expect(resolveExcludedReason(1, null, null)).toBeNull();
        expect(resolveExcludedReason(1, null, applied(null, state, null))).toBeNull();
    });
});
