import type { NgPrismPlugin } from '@ng-prism/core/plugin';
import { scanBundle } from './bundle/bundle-scanner.js';
import type { PerfPluginOptions } from './perf.types.js';

export function perfPlugin(options?: PerfPluginOptions): NgPrismPlugin {
    warnAboutDeprecatedOptions(options);

    return {
        name: '@ng-prism/plugin-perf',

        async onComponentScanned(component) {
            if (component.parentClassName) return;

            const bundle = scanBundle(component.filePath, options?.bundle?.maxTreeDepth ?? 5);

            return {
                ...component,
                showcaseConfig: {
                    ...component.showcaseConfig,
                    meta: {
                        ...component.showcaseConfig.meta,
                        perf: { bundle }
                    }
                }
            };
        },

        panels: [
            {
                id: 'perf',
                label: 'Performance',
                loadComponent: () => import('./perf-panel.component.js').then((m) => m.PerfPanelComponent)
            }
        ]
    };
}

/** Runs in the builder only: the browser entry has its own factory. */
function warnAboutDeprecatedOptions(options: PerfPluginOptions | undefined): void {
    const deprecated = [
        options?.thresholds !== undefined && 'thresholds',
        options?.bundle?.excludeImports !== undefined && 'bundle.excludeImports',
        options?.render !== undefined && 'render',
        options?.memory !== undefined && 'memory'
    ].filter((option): option is string => option !== false);

    for (const option of deprecated) {
        console.warn(`⚠ ng-prism: perfPlugin() option "${option}" is deprecated and will be removed in 23.0.0. It has never had an effect; remove it.`);
    }
}
