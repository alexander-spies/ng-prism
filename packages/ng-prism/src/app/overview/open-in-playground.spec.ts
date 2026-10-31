import { signal } from '@angular/core';
import { isPlaygroundCombination, openInPlayground, playgroundLabel } from './open-in-playground.js';

/** Fakes that record the order of the calls, since the order is part of the contract. */
function fakes() {
    const calls: string[] = [];
    const activeViewId = signal('overview');
    const set = activeViewId.set.bind(activeViewId);

    activeViewId.set = (id) => {
        calls.push(`activeViewId.set(${id})`);
        set(id);
    };

    return {
        calls,
        activeViewId,
        renderer: {
            selectVariant: (index: number) => calls.push(`selectVariant(${index})`),
            selectState: (index: number | null) => calls.push(`selectState(${index})`)
        },
        panels: { activeViewId }
    };
}

describe('openInPlayground', () => {
    it('selects the variant and the state and switches to the Playground', () => {
        const { calls, activeViewId, renderer, panels } = fakes();

        openInPlayground(renderer, panels, 3, 1);

        expect(calls).toEqual(['selectVariant(3)', 'selectState(1)', 'activeViewId.set(renderer)']);
        expect(activeViewId()).toBe('renderer');
    });

    it('clears the state when the cell has none', () => {
        const { calls, renderer, panels } = fakes();

        openInPlayground(renderer, panels, 2, null);

        expect(calls).toEqual(['selectVariant(2)', 'selectState(null)', 'activeViewId.set(renderer)']);
    });
});

describe('isPlaygroundCombination', () => {
    const playground = (variant: number, state: number | null) => ({ activeVariantIndex: signal(variant), activeStateIndex: signal(state) });

    it('should match the variant and the state the Playground shows', () => {
        expect(isPlaygroundCombination(playground(2, 1), 2, 1)).toBe(true);
        expect(isPlaygroundCombination(playground(2, null), 2, null)).toBe(true);
    });

    it('should not match the same variant under another state, or another variant', () => {
        expect(isPlaygroundCombination(playground(2, 1), 2, null)).toBe(false);
        expect(isPlaygroundCombination(playground(2, 1), 2, 0)).toBe(false);
        expect(isPlaygroundCombination(playground(2, 1), 1, 1)).toBe(false);
    });

    // A variant with `states: false` has one cell; whatever state the Playground
    // holds, it shows the variant alone.
    it('should ignore the state for a variant that opted out of states', () => {
        expect(isPlaygroundCombination(playground(1, 0), 1, null, true)).toBe(true);
    });
});

describe('playgroundLabel', () => {
    it('should name the combination the cell opens', () => {
        expect(playgroundLabel('Primary', undefined, null)).toBe('Open Primary in the Playground');
        expect(playgroundLabel('Primary', 'Hover', null)).toBe('Open Primary × Hover in the Playground');
    });

    // O4: the reason is no longer printed in the cell, so the label carries it.
    it('should add why the state does not apply', () => {
        expect(playgroundLabel('Primary', 'Hover', 'hover → .btm matches nothing')).toBe(
            'Open Primary × Hover in the Playground (not applicable: hover → .btm matches nothing)'
        );
    });
});
