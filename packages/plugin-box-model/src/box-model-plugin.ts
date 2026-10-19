import type { NgPrismPlugin } from '@ng-prism/core/plugin';
import { BoxModelStateService } from './box-model-state.service.js';

export function boxModelPlugin(): NgPrismPlugin {
    return {
        name: 'box-model',
        panels: [
            {
                id: 'box-model',
                label: 'Box Model',
                icon: 'box',
                loadComponent: () => import('./box-model-panel.component.js').then((m) => m.BoxModelPanelComponent),
                loadOverlayComponent: () => import('./box-model-overlay.component.js').then((m) => m.BoxModelOverlayComponent),
                providers: [BoxModelStateService]
            }
        ]
    };
}
