import { DOCUMENT } from '@angular/common';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import type { ShowcaseState, Variant } from '../../decorator/showcase.types.js';
import { type ForcedPseudoStates, PSEUDO_STATES, type PseudoState } from '../../shared/pseudo-state.type.js';
import { PseudoStateMarker } from '../pseudo/pseudo-state-marker.js';
import { PseudoStyleSheets } from '../pseudo/pseudo-stylesheets.js';
import type { StateFit } from '../pseudo/state-fit.js';
import { PrismCaptureService } from './prism-capture.service.js';
import { PrismNavigationService } from './prism-navigation.service.js';
import { PrismRendererService } from './prism-renderer.service.js';

/** Per state: forced on (`true`) or off (`false`) on top of what the variant declares. */
export type PseudoStateOverride = Partial<Record<PseudoState, boolean>>;

/** What the canvas forces, in the two layers the marker takes. */
export interface PseudoLayers {
    /** The variant's own states, with the user's toggles on top: forced as they are. */
    base: ForcedPseudoStates | null;
    /** The active state's pseudo: forced only where {@link PrismPseudoStateService.canvasFit} says it fits. `null` when no state applies. */
    state: ForcedPseudoStates | null;
}

/**
 * The variant's and the active state's pseudo states with the user's toggles
 * from the tools menu on top.
 *
 * Returns the two objects it was given while nothing is toggled, so the
 * renderer, which waits for the exact objects it handed the marker, is not sent
 * a copy. A state switched on from the menu applies to the whole component
 * (`true`), the way a pointer over it would, and lands in `base`, which the fit
 * rule does not touch. One the variant or the state declares keeps its own
 * target in its own layer. A state switched off leaves both layers. While a
 * state is active its layer stays an object, an empty one once every class is
 * switched off, so `state` is `null` only when no state applies.
 */
export function splitLayers(variantPseudo: ForcedPseudoStates | null, statePseudo: ForcedPseudoStates | null, override: PseudoStateOverride): PseudoLayers {
    if (Object.keys(override).length === 0) return { base: variantPseudo, state: statePseudo };

    const base: ForcedPseudoStates = {};
    const state: ForcedPseudoStates = {};

    for (const name of PSEUDO_STATES) {
        const forced = override[name];

        if (forced === false) continue;

        const fromVariant = variantPseudo?.[name];
        const fromState = statePseudo?.[name];

        if (fromVariant !== undefined) base[name] = fromVariant;
        if (fromState !== undefined) state[name] = fromState;
        if (forced && fromVariant === undefined && fromState === undefined) base[name] = true;
    }
    return { base: Object.keys(base).length > 0 ? base : null, state: statePseudo ? state : null };
}

/**
 * The pseudo states the canvas forces on the active variant and the active
 * component-level state.
 *
 * `declared` is `Variant.pseudo`, `activeState` is the `ShowcaseState` picked
 * in `PrismRendererService.activeStateIndex`. They are two layers
 * ({@link PseudoLayers}) because only the state's is subject to the fit rule.
 * The tools menu can switch single states on and off on top of both; like the
 * background override, that toggle is transient and resets when the variant, the
 * state or the component changes. Capture mode ignores it, but applies the
 * state: session UI state must not shape a baseline, the addressed cell must.
 *
 * Also owns the document's {@link PseudoStyleSheets}, which every marker shares
 * so each stylesheet is rewritten once, whether the Playground canvas or an
 * Overview cell asks first.
 */
@Injectable({ providedIn: 'root' })
export class PrismPseudoStateService {
    private readonly navigation = inject(PrismNavigationService);
    private readonly renderer = inject(PrismRendererService);
    private readonly capture = inject(PrismCaptureService);
    private readonly stylesheets = new PseudoStyleSheets(inject(DOCUMENT));

    private readonly activeVariant = computed<Variant | null>(() => {
        const comp = this.navigation.activeComponent();

        return comp?.meta.showcaseConfig.variants?.[this.renderer.activeVariantIndex()] ?? null;
    });

    readonly declared = computed<ForcedPseudoStates | null>(() => this.activeVariant()?.pseudo ?? null);

    /** The component-level state on the canvas, whether or not the active variant takes part in it. */
    readonly activeState = computed<ShowcaseState | null>(() => {
        const index = this.renderer.activeStateIndex();

        if (index === null) return null;
        return this.navigation.activeComponent()?.meta.showcaseConfig.states?.[index] ?? null;
    });

    /** `'states: false'` when the active variant opts out while a state is active, else `null`. */
    readonly stateExclusion = computed<string | null>(() => (this.activeState() && this.activeVariant()?.states === false ? 'states: false' : null));

    /** What the active state forces: its pseudo, `null` when none is active or the variant opted out. */
    private readonly statePseudo = computed<ForcedPseudoStates | null>(() => (this.stateExclusion() === null ? (this.activeState()?.pseudo ?? null) : null));

    private readonly _override = signal<PseudoStateOverride>({});
    readonly override = this._override.asReadonly();

    /** What the canvas forces: `declared` and the active state with the user's toggles on top, which capture mode leaves out. */
    readonly layers = computed<PseudoLayers>(() => splitLayers(this.declared(), this.statePseudo(), this.capture.active() ? {} : this._override()));

    /** The variant's layer: what the canvas forced before states existed, and what it still forces without one. */
    readonly effective = computed<ForcedPseudoStates | null>(() => this.layers().base);

    /**
     * Whether the active state fits the rendered canvas. Written by the
     * renderer from its marker, `null` while no state is applied.
     */
    readonly canvasFit = signal<StateFit | null>(null);

    constructor() {
        effect(() => {
            this.navigation.activeComponent();
            this.renderer.activeVariantIndex();
            this.renderer.activeStateIndex();
            this._override.set({});
        });
    }

    /** Whether `state` is forced on the canvas now: by the variant, or by the active state while it fits. */
    isForced(state: PseudoState): boolean {
        const { base, state: layer } = this.layers();

        return base?.[state] !== undefined || (!!this.canvasFit()?.fits && layer?.[state] !== undefined);
    }

    /** Whether the active variant or the active state declares `state`, whether or not it is forced now. */
    isDeclared(state: PseudoState): boolean {
        return this.declared()?.[state] !== undefined || this.statePseudo()?.[state] !== undefined;
    }

    /** Flips `state` against what is forced now. Flipping it back to what the variant or state declares drops the toggle. */
    toggle(state: PseudoState): void {
        const forced = !this.isForced(state);

        this._override.update((override) => {
            const next = { ...override };

            if (forced === this.isDeclared(state)) delete next[state];
            else next[state] = forced;
            return next;
        });
    }

    clearOverride(): void {
        this._override.set({});
    }

    /** A marker for one rendered component, sharing this app's rewritten stylesheets. */
    createMarker(): PseudoStateMarker {
        return new PseudoStateMarker(this.stylesheets);
    }
}
