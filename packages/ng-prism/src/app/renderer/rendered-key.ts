import type { RuntimeComponent } from '../../plugin/plugin.types.js';
import type { ForcedPseudoStates } from '../../shared/pseudo-state.type.js';
import type { AppliedPseudoStates } from '../pseudo/pseudo-state-marker.js';
import { forcesAnyState } from '../pseudo/pseudo-targets.js';

export interface RenderedKeyInput {
    component: RuntimeComponent | null;
    variantIndex: number;
    /** The rendered component's host element, `null` while nothing is rendered. */
    element: Element | null;
    /** The pseudo states the variant forces, `null` when it forces none. */
    pseudo: ForcedPseudoStates | null;
    /** What the canvas marker has the states in place for. */
    pseudoApplied: AppliedPseudoStates | null;
}

/**
 * The value of `data-prism-rendered` on `.demo-wrap`, or `null` while the
 * variant is not ready to be inspected.
 *
 * Screenshot runners wait on this marker, so a variant that forces pseudo
 * states only gets it once those exact states are in place on this exact
 * element. A runner then captures the forced state with no change on its side.
 * A variant without forced states is not held back.
 */
export function resolveRenderedKey({ component, variantIndex, element, pseudo, pseudoApplied }: RenderedKeyInput): string | null {
    if (!element || !component) return null;
    if (forcesAnyState(pseudo) && (pseudoApplied?.root !== element || pseudoApplied.states !== pseudo)) return null;
    return `${component.meta.className}:${variantIndex}`;
}
