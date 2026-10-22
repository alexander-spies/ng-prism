import type { NgPrismPlugin } from '@ng-prism/core/plugin';
import { COVERAGE_NAVIGATION_DECORATION } from './coverage-contributions.js';
import type { CoveragePluginOptions, CoverageThresholds } from './coverage.types.js';

const DEFAULT_COVERAGE_PATH = 'coverage/coverage-summary.json';

export const DEFAULT_COVERAGE_THRESHOLDS: CoverageThresholds = {
    lines: 80,
    branches: 80,
    functions: 80,
    statements: 80
};

export function resolveCoverageThresholds(input?: number | Partial<CoverageThresholds>): CoverageThresholds {
    if (input === undefined) return { ...DEFAULT_COVERAGE_THRESHOLDS };
    if (typeof input === 'number') {
        return {
            lines: input,
            branches: input,
            functions: input,
            statements: input
        };
    }
    return { ...DEFAULT_COVERAGE_THRESHOLDS, ...input };
}

export function coveragePlugin(options?: CoveragePluginOptions): NgPrismPlugin {
    const coveragePath = options?.coveragePath ?? DEFAULT_COVERAGE_PATH;
    const thresholds = resolveCoverageThresholds(options?.thresholds);

    return {
        name: '@ng-prism/plugin-coverage',
        async onComponentScanned(component) {
            const { readCoverageForFile } = await import('./coverage-reader.js');
            const { deriveCoverageSummary } = await import('./coverage-summary.js');
            const coverage = readCoverageForFile(coveragePath, component.filePath);

            return {
                ...component,
                showcaseConfig: {
                    ...component.showcaseConfig,
                    meta: {
                        ...component.showcaseConfig.meta,
                        coverage: {
                            ...coverage,
                            thresholds,
                            ...(coverage.found ? { summary: deriveCoverageSummary(coverage.score, thresholds) } : {})
                        }
                    }
                }
            };
        },
        async onManifestReady(manifest) {
            const { readTotalCoverage } = await import('./coverage-reader.js');
            const total = readTotalCoverage(coveragePath);

            return {
                ...manifest,
                meta: {
                    ...manifest.meta,
                    coverage: { total, thresholds }
                }
            };
        },
        panels: [
            {
                id: 'coverage',
                label: 'Coverage',
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
