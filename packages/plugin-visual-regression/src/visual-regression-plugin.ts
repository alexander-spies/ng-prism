import type { NgPrismPlugin } from '@ng-prism/core/plugin';
import { hasResults, reviewBadge, VRT_NAVIGATION_DECORATION } from './panel-contributions.js';
import { resolveVrtThresholds } from './thresholds.js';
import type { VisualRegressionPluginOptions, VrtComponentMeta } from './visual-regression.types.js';
import { statSummary, summarize } from './vrt-summarize.js';

const DEFAULT_REPORT_PATH = 'vrt-report.json';

/**
 * Renders a visual regression report produced by an external runner.
 *
 * The plugin performs no image comparison of its own. That belongs to the
 * runner, which owns the baselines and the pinned container. See
 * `docs/guide/visual-regression.md`.
 */
export function visualRegressionPlugin(options?: VisualRegressionPluginOptions): NgPrismPlugin {
    const reportPath = options?.reportPath ?? DEFAULT_REPORT_PATH;
    const assetBaseUrl = options?.assetBaseUrl ?? '';
    const thresholds = resolveVrtThresholds(options?.thresholds);

    return {
        name: '@ng-prism/plugin-visual-regression',

        async onComponentScanned(component) {
            if (component.parentClassName) return;

            const { readVariantsForComponent } = await import('./report-reader.js');
            const variants = readVariantsForComponent(reportPath, component.className);

            // The headline is derived here rather than in the component head so the
            // core app never has to reimplement this plugin's status semantics.
            const meta: VrtComponentMeta = {
                found: variants.length > 0,
                variants,
                assetBaseUrl,
                ...(variants.length ? { summary: statSummary(summarize(variants)) } : {})
            };

            return {
                ...component,
                showcaseConfig: {
                    ...component.showcaseConfig,
                    meta: { ...component.showcaseConfig.meta, visualRegression: meta }
                }
            };
        },

        async onManifestReady(manifest) {
            const { readTotals } = await import('./report-reader.js');
            const total = readTotals(reportPath);

            return {
                ...manifest,
                meta: {
                    ...manifest.meta,
                    visualRegression: { found: total !== null, total, thresholds }
                }
            };
        },

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
