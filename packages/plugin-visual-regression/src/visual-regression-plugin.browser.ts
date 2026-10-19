import type { NgPrismPlugin } from '@ng-prism/core/plugin';
import { hasResults, reviewBadge, VRT_NAVIGATION_DECORATION } from './panel-contributions.js';
import type { VisualRegressionPluginOptions } from './visual-regression.types.js';

/**
 * Browser-safe twin of {@link visualRegressionPlugin}.
 *
 * The config is loaded in Node.js by the builder *and* in the browser by the
 * Prism app. Only the runtime contributions survive here; the build-time hooks
 * read the report from disk and must not be reachable from a browser bundle.
 */
export function visualRegressionPlugin(_options?: VisualRegressionPluginOptions): NgPrismPlugin {
    return {
        name: '@ng-prism/plugin-visual-regression',
        panels: [
            {
                id: 'visual-regression',
                label: 'Visual Regression',
                icon: 'camera',
                isVisible: hasResults,
                badge: reviewBadge,
                loadComponent: () => import('./visual-regression-panel.component.js').then((m) => m.VisualRegressionPanelComponent)
            }
        ],
        headerWidgets: [
            {
                id: 'visual-regression-total',
                placement: 'end',
                order: -10,
                loadComponent: () => import('./visual-regression-header-badge.component.js').then((m) => m.VisualRegressionHeaderBadgeComponent)
            }
        ],

        navigationDecorations: [VRT_NAVIGATION_DECORATION]
    };
}
