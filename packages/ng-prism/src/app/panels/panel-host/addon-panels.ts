import type { PanelDefinition, RuntimeComponent } from '../../../plugin/plugin.types.js';
import { panelTargets } from '../../view-tab-bar/panel-inputs.js';

/**
 * The addon panels a component page shows: those that apply to components and,
 * when a component is active, pass their `isVisible`.
 *
 * Addon panels only ever appear below the canvas of a component, so a panel
 * that applies to services only has no place here. Rendered anyway it would
 * be handed `activeComponent`, an input it may not declare (NG0303).
 */
export function addonPanelsFor(panels: readonly PanelDefinition[], component: RuntimeComponent | null): PanelDefinition[] {
    return panels.filter((p) => panelTargets(p).includes('component') && (!component || !p.isVisible || p.isVisible(component)));
}
