import type { RuntimeComponent } from '../../plugin/plugin.types.js';
import type { ForcedPseudoStates } from '../../shared/pseudo-state.type.js';
import type { AppliedPseudoStates } from '../pseudo/pseudo-state-marker.js';
import { forcesAnyState } from '../pseudo/pseudo-targets.js';

export interface RenderedKeyInput {
    component: RuntimeComponent | null;
    variantIndex: number;
    /** The component-level state on the canvas, `null` when none is active. */
    stateIndex: number | null;
    /** The rendered component's host element, `null` while nothing is rendered. */
    element: Element | null;
    /** The pseudo states the variant forces, `null` when it forces none. */
    pseudo: ForcedPseudoStates | null;
    /** The active state's pseudo, `null` when no state applies to the variant. */
    state: ForcedPseudoStates | null;
    /** What the canvas marker has the states in place for. */
    pseudoApplied: AppliedPseudoStates | null;
}

/**
 * The value of `data-prism-rendered` on `.demo-wrap`, or `null` while the
 * variant is not ready to be inspected: `<className>:<variantIndex>`, with
 * `:<stateIndex>` while a component-level state is active.
 *
 * Screenshot runners wait on this marker, so a variant that forces pseudo
 * states, or has a state layer, only gets it once those exact objects are in
 * place on this exact element. A runner then captures the forced state with no
 * change on its side. A variant without forced states is not held back. The
 * index is there for an opted-out variant too (`state` is `null`), so a runner
 * waiting for its cell finds it.
 */
export function resolveRenderedKey({ component, variantIndex, stateIndex, element, pseudo, state, pseudoApplied }: RenderedKeyInput): string | null {
    if (!element || !component) return null;
    if ((forcesAnyState(pseudo) || state !== null) && (pseudoApplied?.root !== element || pseudoApplied.states !== pseudo || pseudoApplied.state !== state)) return null;

    const key = `${component.meta.className}:${variantIndex}`;

    return stateIndex === null ? key : `${key}:${stateIndex}`;
}

/**
 * The value of `data-prism-excluded` on `.demo-wrap`, or `null` when the cell
 * shows what it was asked for: why the active state is not part of this
 * variant, either because the variant opted out (`exclusion`) or because the
 * marker found the state does not fit the rendered component.
 */
export function resolveExcludedReason(stateIndex: number | null, exclusion: string | null, applied: AppliedPseudoStates | null): string | null {
    if (stateIndex === null) return null;
    if (exclusion !== null) return exclusion;
    return applied?.fit?.fits === false ? applied.fit.reason : null;
}
