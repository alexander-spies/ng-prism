import type { ShowcaseState } from '../../decorator/showcase.types.js';
import type { ForcedPseudoStates, PseudoState } from '../../shared/pseudo-state.type.js';
import type { StateFit } from '../pseudo/state-fit.js';

/** One chip of the tools menu's State group: a component-level state to put on the canvas. */
export interface StateChip {
    /** Position in `ShowcaseConfig.states`, which is what identifies a state. */
    index: number;
    name: string;
    /** On the canvas, or selected and waiting for a target if it does not fit. */
    active: boolean;
    fits: boolean;
    title: string;
}

/**
 * One chip per state in declaration order. `fits` is parallel to `states`; a
 * state without an entry yet (nothing evaluated) counts as fitting.
 *
 * A chip that does not fit says why, even while it is the active one: it is
 * selected, but what the title would otherwise promise ("is shown") is not true.
 */
export function buildStateChips(states: readonly ShowcaseState[], activeIndex: number | null, fits: readonly StateFit[]): StateChip[] {
    return states.map((state, index) => {
        const fit = fits[index] ?? { fits: true };
        const active = index === activeIndex;
        let title = `Show ${state.name} on this variant`;

        if (!fit.fits) title = `${state.name} does not fit this variant: ${fit.reason}`;
        else if (active) title = `${state.name} is shown; click to turn it off`;
        return { index, name: state.name, active, fits: fit.fits, title };
    });
}

/** What {@link chipFits} needs to know about the canvas. */
export interface ChipFitContext {
    /** The rendered component, `null` before the first render. */
    element: Element | null;
    /** The active variant has `states: false`. */
    optedOut: boolean;
    activeIndex: number | null;
    /** The fit the canvas measured for the active state, `null` while it applies none. */
    canvasFit: StateFit | null;
}

/**
 * Whether each of `states` fits what is on the canvas, in the order of `states`.
 *
 * The active state takes the fit the canvas measured, so a chip and the canvas
 * cannot disagree; the others are evaluated against the same element. Without an
 * element there is nothing to measure and everything counts as fitting, as it
 * does on the canvas before the first render.
 */
export function chipFits(
    states: readonly ShowcaseState[],
    { element, optedOut, activeIndex, canvasFit }: ChipFitContext,
    evaluate: (root: Element, pseudo: ForcedPseudoStates) => StateFit
): StateFit[] {
    if (optedOut) return states.map(() => ({ fits: false, reason: 'states: false' }));
    if (element === null) return states.map(() => ({ fits: true }));
    return states.map((state, index) => (index === activeIndex && canvasFit !== null ? canvasFit : evaluate(element, state.pseudo)));
}

/** Who declares a pseudo-class that is on without the user toggling it. */
export type PseudoSource = { by: 'variant' } | { by: 'state'; name: string };

/** Tooltip of a `:hover`… toggle: where its default comes from, or what switching it on does. */
export function toggleTitle(state: PseudoState, source: PseudoSource | null): string {
    if (source === null) return `Force :${state} on the whole component`;
    return source.by === 'variant' ? `:${state} is forced by this variant` : `:${state} is forced by the state "${source.name}"`;
}
