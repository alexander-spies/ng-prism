import { DOCUMENT } from '@angular/common';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { type ForcedPseudoStates, PSEUDO_STATES, type PseudoState } from '../../shared/pseudo-state.type.js';
import { PseudoStateMarker } from '../pseudo/pseudo-state-marker.js';
import { PseudoStyleSheets } from '../pseudo/pseudo-stylesheets.js';
import { PrismCaptureService } from './prism-capture.service.js';
import { PrismNavigationService } from './prism-navigation.service.js';
import { PrismRendererService } from './prism-renderer.service.js';

/** Per state: forced on (`true`) or off (`false`) on top of what the variant declares. */
export type PseudoStateOverride = Partial<Record<PseudoState, boolean>>;

/**
 * `declared` with the user's toggles from the tools menu on top.
 *
 * Returns `declared` itself while nothing is toggled, so the renderer, which
 * waits for the exact states object it was given, is not sent a copy. A state
 * switched on from the menu applies to the whole component (`true`), the way a
 * pointer over it would. One the variant declares keeps its own target.
 */
export function withOverride(declared: ForcedPseudoStates | null, override: PseudoStateOverride): ForcedPseudoStates | null {
    if (Object.keys(override).length === 0) return declared;

    const states: ForcedPseudoStates = {};

    for (const state of PSEUDO_STATES) {
        const forced = override[state];
        const target = forced === undefined ? declared?.[state] : forced ? (declared?.[state] ?? true) : undefined;

        if (target !== undefined) states[state] = target;
    }
    return Object.keys(states).length > 0 ? states : null;
}

/**
 * The pseudo states the canvas forces on the active variant.
 *
 * `declared` is `Variant.pseudo`. The tools menu can switch states on and off
 * on top of it; like the background override, that toggle is transient and
 * resets when the variant or the component changes. Capture mode ignores it:
 * it is session UI state and must not shape a baseline.
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

    readonly declared = computed<ForcedPseudoStates | null>(() => {
        const comp = this.navigation.activeComponent();

        if (!comp) return null;
        return comp.meta.showcaseConfig.variants?.[this.renderer.activeVariantIndex()]?.pseudo ?? null;
    });

    private readonly _override = signal<PseudoStateOverride>({});
    readonly override = this._override.asReadonly();

    /** What the canvas forces: `declared`, with the user's toggles on top outside capture mode. */
    readonly effective = computed<ForcedPseudoStates | null>(() => (this.capture.active() ? this.declared() : withOverride(this.declared(), this._override())));

    constructor() {
        effect(() => {
            this.navigation.activeComponent();
            this.renderer.activeVariantIndex();
            this._override.set({});
        });
    }

    isForced(state: PseudoState): boolean {
        return this.effective()?.[state] !== undefined;
    }

    isDeclared(state: PseudoState): boolean {
        return this.declared()?.[state] !== undefined;
    }

    /** Flips `state` against what is forced now. Flipping it back to what the variant declares drops the toggle. */
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
