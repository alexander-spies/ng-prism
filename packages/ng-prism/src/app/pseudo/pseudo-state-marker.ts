import { signal } from '@angular/core';
import { type ForcedPseudoStates, PSEUDO_STATES, type PseudoState } from '../../shared/pseudo-state.type.js';
import { PSEUDO_CLASS_PREFIX, pseudoStateClass } from './pseudo-selector.js';
import type { PseudoStyleSheets } from './pseudo-stylesheets.js';
import { forcesAnyState, hasTarget, resolveTargets } from './pseudo-targets.js';
import { evaluateStateFit, reachableTargets, type StateFit } from './state-fit.js';

/** The element a marker forces states in, and the states it forces there. */
export interface AppliedPseudoStates {
    root: Element;
    /** The variant's own states with the toggles on top, unfiltered as in 22.5.0. */
    states: ForcedPseudoStates | null;
    /** The active state's pseudo, `null` when no state is active. */
    state: ForcedPseudoStates | null;
    /** `null` when `state` is `null`. Re-evaluated on every mark. */
    fit: StateFit | null;
}

/** The pseudo-classes actually forced right now: `states`, plus `state` while it fits. */
export function appliedStateNames(applied: AppliedPseudoStates | null): PseudoState[] {
    if (!applied) return [];
    const { states, state, fit } = applied;
    const stateForced = !!state && !!fit?.fits;

    return PSEUDO_STATES.filter((name) => hasTarget(states?.[name]) || (stateForced && hasTarget(state[name])));
}

/** A `class` attribute without the marker's own classes: all a selector can tell apart. */
function withoutMarks(classAttribute: string | null): string {
    return (classAttribute ?? '')
        .split(/\s+/)
        .filter((cls) => cls !== '' && !cls.startsWith(PSEUDO_CLASS_PREFIX))
        .join(' ');
}

/**
 * Whether `record` can change what a selector matches, and with it the targets
 * or the fit. Inline styles cannot (an animation can write them every frame),
 * and neither can a `class` change that only adds or removes the marker's own
 * classes: those are the marker's writes coming back, and acting on them would
 * let a state whose class takes away its own reach (`pointer-events: none`)
 * flip the fit, and the class with it, in a loop of microtasks.
 */
function changesMatches(record: MutationRecord): boolean {
    if (record.attributeName === 'style') return false;
    if (record.attributeName !== 'class') return true;
    return withoutMarks(record.oldValue) !== withoutMarks((record.target as Element).getAttribute('class'));
}

function sameFit(a: StateFit | null, b: StateFit | null): boolean {
    if (a === null || b === null) return a === b;
    return a.fits ? b.fits : !b.fits && a.reason === b.reason;
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
 * every selector using the pseudo-class also matches that class. The
 * component's own CSS then applies, with no special case for sibling
 * combinators, pseudo-elements, `:has()` or `:not()`.
 *
 * A second layer carries the component state that is active: its pseudo is
 * forced only while it fits, and only on the targets a user could reach
 * ({@link evaluateStateFit}). The variant's own states are forced as they are.
 *
 * The root is watched while states are forced: an element rendered later
 * (`@if`), or one whose classes or attributes change so that it starts or
 * stops matching a selector (`button:not([disabled])`), is marked again, and
 * the state is checked again.
 *
 * One marker per rendered component: the Playground canvas has one, each
 * Overview cell has its own, so a state never leaks into a neighbouring cell.
 */
export class PseudoStateMarker {
    private readonly _applied = signal<AppliedPseudoStates | null>(null);
    private observer: MutationObserver | null = null;

    /**
     * What the marks are in place for, `null` while nothing is forced and no
     * state is active. A signal, so the renderer can hold back
     * `data-prism-rendered` until the states it reports are the ones on screen.
     * A state that does not fit keeps it set, with the reason in `fit`.
     */
    readonly applied = this._applied.asReadonly();

    constructor(private readonly stylesheets: PseudoStyleSheets) {}

    /**
     * Forces `states`, and `state` where it fits, under `root`, replacing
     * whatever this marker forced before.
     */
    apply(root: Element | null, states: ForcedPseudoStates | null | undefined, state?: ForcedPseudoStates | null): void {
        if (!root || (!forcesAnyState(states) && !state)) {
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

        this._applied.set({ root, states: states ?? null, state: state ?? null, fit: null });
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
        // Our own class changes come back through here too, see changesMatches.
        this.observer = new MutationObserver((records) => {
            if (records.some(changesMatches)) this.mark();
        });
        this.observer.observe(root, { childList: true, subtree: true, attributes: true, attributeOldValue: true });
    }

    private mark(): void {
        const applied = this._applied();

        if (!applied) return;
        const { root, states, state } = applied;
        // Before this pass touches a class, so the fit never rests on the marks
        // this pass is about to set.
        const fit = state ? evaluateStateFit(root, state) : null;

        // Only a change of the fit is news. The signal setting off its own
        // effects is harmless, a new value on every mark is not.
        if (!sameFit(applied.fit, fit)) this._applied.set({ ...applied, fit });

        for (const name of PSEUDO_STATES) {
            const cls = pseudoStateClass(name);
            const targets = resolveTargets(root, states?.[name]);

            if (state && fit?.fits) {
                for (const el of reachableTargets(root, name, resolveTargets(root, state[name]))) targets.add(el);
            }

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
