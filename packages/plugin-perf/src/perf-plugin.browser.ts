import type { NgPrismPlugin } from '@ng-prism/core/plugin';
import type { PerfPluginOptions } from './perf.types.js';

export function perfPlugin(_options?: PerfPluginOptions): NgPrismPlugin {
    return {
        name: '@ng-prism/plugin-perf',
        panels: [
            {
                id: 'perf',
                label: 'Performance',
                icon: 'activity',
                loadComponent: () => import('./perf-panel.component.js').then((m) => m.PerfPanelComponent),
                placement: 'addon'
            }
        ]
    };
}
