import { type ForcedPseudoStates, PSEUDO_STATES, type PseudoState, type PseudoTarget } from '../../shared/pseudo-state.type.js';
import { forcesAnyState, resolveTargets } from './pseudo-state-marker.js';

/** Whether a state can be forced on a rendered component, and if not, why. */
export type StateFit = { fits: true } | { fits: false; reason: string };

/** `true` is the whole component, a selector list reads as its selectors joined with `, `. */
export function describeTarget(target: PseudoTarget): string {
    if (target === true) return 'the component';
    return typeof target === 'string' ? target : target.join(', ');
}

function isDisabled(el: Element): boolean {
    return el.matches(':disabled');
}

/** Under `[inert]` within the component: an `inert` outside `root` is not the component's doing. */
function isInert(root: Element, el: Element): boolean {
    const inert = el.closest('[inert]');

    return inert !== null && root.contains(inert);
}

/**
 * Whether `el` or something inside it receives the pointer. `pointer-events`
 * inherits, so a subtree of `none` is unreachable unless a descendant sets it
 * back, and then the browser hands that descendant the hover.
 */
function takesPointer(el: Element, known: Map<Element, boolean>): boolean {
    let reachable = known.get(el);

    if (reachable === undefined) {
        reachable = getComputedStyle(el).pointerEvents !== 'none' || Array.from(el.children).some((child) => takesPointer(child, known));
        known.set(el, reachable);
    }
    return reachable;
}

/**
 * The subset of `elements` the browser could put into `state`: what a user
 * could focus, or hover, or press. Forcing a state on anything else would show
 * something the component can never be in.
 *
 * `focus-within` is not filtered. Whether some descendant takes focus cannot be
 * told without a browser API for focusability.
 */
export function reachableTargets(root: Element, state: PseudoState, elements: Iterable<Element>): Element[] {
    switch (state) {
        case 'focus':
        case 'focus-visible':
            return Array.from(elements).filter((el) => !isDisabled(el) && !isInert(root, el));
        case 'hover':
        case 'active': {
            const known = new Map<Element, boolean>();

            return Array.from(elements).filter((el) => takesPointer(el, known));
        }
        case 'focus-within':
            return Array.from(elements);
    }
}

/** Why `elements`, all of them unreachable for `state`, are: the first applicable of disabled, inert and pointer-events. */
function unreachableReason(state: PseudoState, elements: Set<Element>): string {
    if (state === 'hover' || state === 'active') return 'has pointer-events: none';
    return Array.from(elements).some(isDisabled) ? 'is disabled' : 'is inert';
}

/**
 * Fits when every pseudo-class of `pseudo` has at least one reachable target
 * under `root`. The reason names the first pseudo-class, in
 * {@link PSEUDO_STATES} order, that does not.
 */
export function evaluateStateFit(root: Element, pseudo: ForcedPseudoStates): StateFit {
    if (!forcesAnyState(pseudo)) return { fits: false, reason: 'forces no state' };

    for (const state of PSEUDO_STATES) {
        const target = pseudo[state];

        // Like the marker, which gives an empty selector no element to mark.
        if (target === undefined || !forcesAnyState({ [state]: target })) continue;

        const targets = resolveTargets(root, target);
        const label = describeTarget(target);

        if (targets.size === 0) return { fits: false, reason: `${label} matches nothing` };
        if (reachableTargets(root, state, targets).length === 0) return { fits: false, reason: `${label} ${unreachableReason(state, targets)}` };
    }
    return { fits: true };
}
