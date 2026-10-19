import { type ForcedPseudoStates, PSEUDO_STATES, type PseudoTarget } from '../../shared/pseudo-state.type.js';

/** True when `states` forces at least one state on at least one target. */
export function forcesAnyState(states: ForcedPseudoStates | null | undefined): states is ForcedPseudoStates {
    return !!states && PSEUDO_STATES.some((state) => hasTarget(states[state]));
}

/** True when `target` names something: `true`, or a selector that is not blank. */
export function hasTarget(target: PseudoTarget | undefined): boolean {
    if (target === true) return true;
    if (typeof target === 'string') return target.trim() !== '';
    return Array.isArray(target) && target.some((selector) => typeof selector === 'string' && selector.trim() !== '');
}

const warnedSelectors = new Set<string>();

/**
 * The elements under `root` a target names. `root` counts: a selector can name
 * the component's host, and `true` includes it.
 */
export function resolveTargets(root: Element, target: PseudoTarget | undefined): Set<Element> {
    const targets = new Set<Element>();

    if (target === undefined) return targets;
    if (target === true) {
        targets.add(root);
        for (const el of Array.from(root.querySelectorAll('*'))) targets.add(el);
        return targets;
    }

    for (const selector of typeof target === 'string' ? [target] : target) {
        if (typeof selector !== 'string' || selector.trim() === '') continue;
        try {
            if (root.matches(selector)) targets.add(root);
            for (const el of Array.from(root.querySelectorAll(selector))) targets.add(el);
        } catch {
            if (!warnedSelectors.has(selector)) {
                warnedSelectors.add(selector);
                console.warn(`[ng-prism] "${selector}" in forced pseudo states is not a valid selector, skipping it.`);
            }
        }
    }
    return targets;
}
