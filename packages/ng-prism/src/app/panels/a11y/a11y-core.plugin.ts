import type { PanelDefinition } from '../../../plugin/plugin.types.js';

export const A11Y_CORE_PANEL: PanelDefinition = {
    id: 'a11y',
    label: 'A11y',
    icon: 'accessibility',
    placement: 'addon',
    loadComponent: () => import('./a11y-panel.component.js').then((m) => m.A11yPanelComponent),
    loadOverlayComponent: () => import('./a11y-overlay-host.component.js').then((m) => m.A11yOverlayHostComponent)
};
