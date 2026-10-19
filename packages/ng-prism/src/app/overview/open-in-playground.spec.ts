import { signal } from '@angular/core';
import { openInPlayground } from './open-in-playground.js';

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
