import type { PanelDefinition } from '../../plugin/plugin.types.js';
import type { PanelTarget } from '../../plugin/service.types.js';

/**
 * The view to switch to, or `null` when the active one still stands.
 *
 * A view survives a component switch for as long as the new component still
 * offers it. That is the whole rule. `renderer` needs no check of its own
 * because it is the one view every component has: there is no `isVisible` for
 * the Playground, so it can never drop out of the visible list and never
 * needs a fallback away from itself.
 *
 * A service has no Playground, so on a service page the rule has no `renderer`
 * to fall back to: an active view that is not offered, `renderer` included,
 * gives way to the first panel the service does offer, or to nothing when it
 * offers none.
 */
export function nextViewId(activeViewId: string, visibleViewPanels: readonly PanelDefinition[], target: PanelTarget = 'component'): string | null {
    if (target === 'service') {
        return visibleViewPanels.some((p) => p.id === activeViewId) ? null : (visibleViewPanels[0]?.id ?? null);
    }
    if (activeViewId === 'renderer') return null;
    return visibleViewPanels.some((p) => p.id === activeViewId) ? null : 'renderer';
}
