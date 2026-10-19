import type { NgPrismPlugin } from '@ng-prism/core/plugin';
import { COVERAGE_NAVIGATION_DECORATION, coverageBadge } from './coverage-contributions.js';
import type { CoveragePluginOptions } from './coverage.types.js';

export function coveragePlugin(_options?: CoveragePluginOptions): NgPrismPlugin {
    return {
        name: '@ng-prism/plugin-coverage',
        panels: [
            {
                id: 'coverage',
                label: 'Coverage',
                badge: coverageBadge,
                icon: 'shield-check',
                loadComponent: () => import('./coverage-panel.component.js').then((m) => m.CoveragePanelComponent)
            }
        ],
        headerWidgets: [
            {
                id: 'coverage-total',
                placement: 'end',
                order: -10,
                loadComponent: () => import('./coverage-header-badge.component.js').then((m) => m.CoverageHeaderBadgeComponent)
            }
        ],

        navigationDecorations: [COVERAGE_NAVIGATION_DECORATION]
    };
}
