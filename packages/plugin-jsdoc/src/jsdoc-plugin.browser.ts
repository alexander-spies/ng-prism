import type { NgPrismPlugin } from '@ng-prism/core/plugin';

export function jsDocPlugin(): NgPrismPlugin {
    return {
        name: '@ng-prism/plugin-jsdoc',
        panels: [
            {
                id: 'jsdoc',
                label: 'API',
                icon: 'file-text',
                loadComponent: () => import('./jsdoc-panel.component.js').then((m) => m.JsDocPanelComponent),
                placement: 'view'
            }
        ]
    };
}
