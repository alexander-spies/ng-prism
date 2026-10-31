import type { PrismPanelService } from '../services/prism-panel.service.js';
import type { PrismRendererService } from '../services/prism-renderer.service.js';

/**
 * Shows one Overview cell's exact combination in the Playground: the variant,
 * the component state (`null` for none), and the Playground view itself.
 *
 * The view switches last, so the Playground never paints the variant it showed
 * before for a frame.
 */
export function openInPlayground(
    renderer: Pick<PrismRendererService, 'selectVariant' | 'selectState'>,
    panels: Pick<PrismPanelService, 'activeViewId'>,
    variantIndex: number,
    stateIndex: number | null
): void {
    // In this order: `selectVariant()` clears the state, so selecting it first would drop the cell's.
    renderer.selectVariant(variantIndex);
    renderer.selectState(stateIndex);
    panels.activeViewId.set('renderer');
}

/**
 * Whether a cell shows what the Playground shows: the same variant under the
 * same component state. A variant that opted out with `states: false` shows
 * no state in either place, so only the variant counts for it.
 */
export function isPlaygroundCombination(
    renderer: Pick<PrismRendererService, 'activeVariantIndex' | 'activeStateIndex'>,
    variantIndex: number,
    stateIndex: number | null,
    statesOptedOut = false
): boolean {
    return renderer.activeVariantIndex() === variantIndex && (statesOptedOut || renderer.activeStateIndex() === stateIndex);
}

/** A cell's accessible name, with the reason when its state does not apply: the cell itself shows only a dash then. */
export function playgroundLabel(variant: string, state: string | undefined, unfitReason: string | null): string {
    const label = `Open ${variant}${state ? ` × ${state}` : ''} in the Playground`;

    return unfitReason === null ? label : `${label} (not applicable: ${unfitReason})`;
}
