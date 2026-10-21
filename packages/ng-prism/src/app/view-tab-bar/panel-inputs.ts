import type { PanelDefinition, RuntimeComponent } from '../../plugin/plugin.types.js';
import type { PanelTarget, RuntimeService } from '../../plugin/service.types.js';

/** The page kinds a panel appears on. A panel that does not say is a component panel. */
export function panelTargets(panel: PanelDefinition): readonly PanelTarget[] {
    return panel.appliesTo ?? ['component'];
}

/**
 * The inputs a view panel is rendered with: `activeComponent` for a panel that
 * applies to components, `activeService` for one that applies to services, both
 * for one that applies to both, and nothing else.
 *
 * The restriction is the point. `NgComponentOutlet` logs NG0303 for an input the
 * component does not declare, so a panel written before services existed would
 * start logging if it were handed `activeService` too.
 */
export function panelInputsFor(panel: PanelDefinition | undefined, component: RuntimeComponent | null, service: RuntimeService | null): Record<string, unknown> {
    if (!panel) return { activeComponent: component };

    const targets = panelTargets(panel);
    const inputs: Record<string, unknown> = {};

    if (targets.includes('component')) inputs['activeComponent'] = component;
    if (targets.includes('service')) inputs['activeService'] = service;
    return inputs;
}
