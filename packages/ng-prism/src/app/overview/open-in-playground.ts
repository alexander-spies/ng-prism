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
    renderer.selectVariant(variantIndex);
    renderer.selectState(stateIndex);
    panels.activeViewId.set('renderer');
}
