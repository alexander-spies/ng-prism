import type { NgPrismPlugin } from '@ng-prism/core/plugin';
import { extractJsDocData } from './jsdoc-extractor.js';

export function jsDocPlugin(): NgPrismPlugin {
    return {
        name: '@ng-prism/plugin-jsdoc',
        // The API page reads `ScannedComponent.api`, which the scan only reads for a plugin that asks for it.
        componentApi: true,
        async onComponentScanned(component) {
            const jsdoc = extractJsDocData(component.filePath, component.className, component.baseClasses);

            if (!jsdoc) return;
            return {
                ...component,
                showcaseConfig: {
                    ...component.showcaseConfig,
                    meta: { ...component.showcaseConfig.meta, jsdoc }
                }
            };
        },
        panels: [
            {
                id: 'jsdoc',
                label: 'API',
                icon: 'file-text',
                loadComponent: () => import('./jsdoc-panel.component.js').then((m) => m.JsDocPanelComponent),
                placement: 'view',
                appliesTo: ['component', 'service', 'pipe'],
                // A component's parts are blocks on its API page, so the core hands the panel `activePart`.
                listsParts: true
            }
        ]
    };
}
