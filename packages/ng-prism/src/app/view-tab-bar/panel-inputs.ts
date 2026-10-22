import type { RuntimePipe } from '../../plugin/pipe.types.js';
import type { PanelDefinition, RuntimeComponent } from '../../plugin/plugin.types.js';
import type { PanelTarget, RuntimeService } from '../../plugin/service.types.js';

/** The page kinds a panel appears on. A panel that does not say is a component panel. */
export function panelTargets(panel: PanelDefinition): readonly PanelTarget[] {
    return panel.appliesTo ?? ['component'];
}

/**
 * The view panel to render for the active view id, or `undefined` when the page
 * kind is not one the panel applies to.
 *
 * The id can outlive the page it was chosen on: a component's Overview is still
 * the active view for a moment after the reader opens a service or a pipe, until
 * the shell picks one the page offers, and it stays when the page offers none.
 * Rendering it there would hand a component panel a service or pipe page.
 */
export function activeViewPanel(viewPanels: readonly PanelDefinition[], activeViewId: string, target: PanelTarget): PanelDefinition | undefined {
    const panel = viewPanels.find((p) => p.id === activeViewId);

    return panel && panelTargets(panel).includes(target) ? panel : undefined;
}

/**
 * The inputs a view panel is rendered with: `activeComponent` for a panel that
 * applies to components, `activeService` for one that applies to services,
 * `activePipe` for one that applies to pipes, one input per kind it applies to,
 * and nothing else.
 *
 * The restriction is the point. `NgComponentOutlet` logs NG0303 for an input the
 * component does not declare, so a panel written before services or pipes
 * existed would start logging if it were handed `activeService` or `activePipe`
 * too.
 */
export function panelInputsFor(
    panel: PanelDefinition | undefined,
    component: RuntimeComponent | null,
    service: RuntimeService | null,
    pipe: RuntimePipe | null
): Record<string, unknown> {
    if (!panel) return { activeComponent: component };

    const targets = panelTargets(panel);
    const inputs: Record<string, unknown> = {};

    if (targets.includes('component')) inputs['activeComponent'] = component;
    if (targets.includes('service')) inputs['activeService'] = service;
    if (targets.includes('pipe')) inputs['activePipe'] = pipe;
    return inputs;
}
