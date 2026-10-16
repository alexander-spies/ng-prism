import { signal } from '@angular/core';
import { type ForcedPseudoStates, PSEUDO_STATES, type PseudoTarget } from '../../shared/pseudo-state.type.js';
import { PSEUDO_CLASS_PREFIX, pseudoStateClass } from './pseudo-selector.js';
import type { PseudoStyleSheets } from './pseudo-stylesheets.js';

/** The element a marker forces states in, and the states it forces there. */
export interface AppliedPseudoStates {
    root: Element;
    states: ForcedPseudoStates;
}

/** True when `states` forces at least one state on at least one target. */
export function forcesAnyState(states: ForcedPseudoStates | null | undefined): states is ForcedPseudoStates {
    return !!states && PSEUDO_STATES.some((state) => hasTarget(states[state]));
}

function hasTarget(target: PseudoTarget | undefined): boolean {
    if (target === true) return true;
    if (typeof target === 'string') return target.trim() !== '';
    return Array.isArray(target) && target.some((selector) => typeof selector === 'string' && selector.trim() !== '');
}

const warnedSelectors = new Set<string>();

/**
 * The elements under `root` a target names. `root` counts: a selector can name
 * the component's host, and `true` includes it.
 */
function resolveTargets(root: Element, target: PseudoTarget | undefined): Set<Element> {
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
                console.warn(`[ng-prism] "${selector}" in a variant's pseudo states is not a valid selector, skipping it.`);
            }
        }
    }
    return targets;
}

/** Every element under `root`, `root` included, that carries a forced-state class. */
function markedElements(root: Element): Element[] {
    const marked = Array.from(root.querySelectorAll(`[class*="${PSEUDO_CLASS_PREFIX}"]`));

    return Array.from(root.classList).some((cls) => cls.startsWith(PSEUDO_CLASS_PREFIX)) ? [root, ...marked] : marked;
}

/**
 * Forces a variant's pseudo states on one rendered component.
 *
 * Puts the stand-in class of each state ({@link pseudoStateClass}) on the
 * targeted elements, and holds the document's {@link PseudoStyleSheets} so that
 * every rule using the pseudo-class has a copy keyed on that class. The
 * component's own CSS then applies, with no special case for sibling
 * combinators, pseudo-elements or `:has()`.
 *
 * The root is watched while states are forced: an element rendered later
 * (`@if`), or one whose classes change so that it starts or stops matching a
 * selector, is marked again.
 *
 * One marker per rendered component: the Playground canvas has one, each
 * Overview cell has its own, so a state never leaks into a neighbouring cell.
 */
export class PseudoStateMarker {
    private readonly _applied = signal<AppliedPseudoStates | null>(null);
    private observer: MutationObserver | null = null;

    /**
     * What the marks are in place for, `null` while nothing is forced. A
     * signal, so the renderer can hold back `data-prism-rendered` until the
     * states it reports are the ones on screen.
     */
    readonly applied = this._applied.asReadonly();

    constructor(private readonly stylesheets: PseudoStyleSheets) {}

    /** Forces `states` under `root`, replacing whatever this marker forced before. */
    apply(root: Element | null, states: ForcedPseudoStates | null | undefined): void {
        if (!root || !forcesAnyState(states)) {
            this.clear();
            return;
        }

        const previous = this._applied();

        if (previous && previous.root !== root) this.clear();
        if (!this._applied()) {
            this.stylesheets.acquire();
            this.observe(root);
        } else {
            // Same root, new variant: its styles may have arrived since.
            this.stylesheets.sync();
        }

        this._applied.set({ root, states });
        this.mark();
    }

    /** Removes every mark, stops watching, and releases the stylesheets. */
    clear(): void {
        const applied = this._applied();

        if (!applied) return;
        this.observer?.disconnect();
        this.observer = null;
        for (const el of markedElements(applied.root)) {
            for (const state of PSEUDO_STATES) el.classList.remove(pseudoStateClass(state));
        }
        this._applied.set(null);
        this.stylesheets.release();
    }

    private observe(root: Element): void {
        if (typeof MutationObserver === 'undefined') return;
        // Our own class changes come back through here too; the second pass finds nothing to change.
        this.observer = new MutationObserver(() => this.mark());
        this.observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    }

    private mark(): void {
        const applied = this._applied();

        if (!applied) return;
        const { root, states } = applied;

        for (const state of PSEUDO_STATES) {
            const cls = pseudoStateClass(state);
            const targets = resolveTargets(root, states[state]);

            // `classList.remove` writes the attribute even when the class is absent,
            // and the write would come back through the observer as a mutation.
            for (const el of markedElements(root)) {
                if (!targets.has(el) && el.classList.contains(cls)) el.classList.remove(cls);
            }
            for (const el of targets) {
                if (!el.classList.contains(cls)) el.classList.add(cls);
            }
        }
    }
}
