import type { PanelDefinition } from '../../plugin/plugin.types.js';
import type { PanelTarget } from '../../plugin/service.types.js';

/**
 * The view to switch to, or `null` when the active one still stands.
 *
 * On a component page a view stands as long as the component offers it; one
 * it does not offer (a URL names it, a panel's `isVisible` turns it down) gives
 * way to `renderer`. A switch to another component does not get here with the
 * old view: `PrismPanelService.activeViewId` starts every component on
 * `renderer`. `renderer` needs no check of its own because it is the one view
 * every component has: there is no `isVisible` for the Playground, so it can
 * never drop out of the visible list and never needs a fallback away from
 * itself.
 *
 * A service or a pipe has no Playground, so on those pages the rule has no
 * `renderer` to fall back to: an active view that is not offered, `renderer`
 * included, gives way to the first panel the page does offer, or to nothing
 * when it offers none.
 */
export function nextViewId(activeViewId: string, visibleViewPanels: readonly PanelDefinition[], target: PanelTarget = 'component'): string | null {
    if (target !== 'component') {
        return visibleViewPanels.some((p) => p.id === activeViewId) ? null : (visibleViewPanels[0]?.id ?? null);
    }
    if (activeViewId === 'renderer') return null;
    return visibleViewPanels.some((p) => p.id === activeViewId) ? null : 'renderer';
}
