import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PrismMetricCardComponent, toneForStatus } from '@ng-prism/core';
import { coverageMetricTone } from './coverage-metric-tone.js';
import type { CoverageData, CoverageThresholds, FileCoverageDetail } from './coverage.types.js';

const FALLBACK_THRESHOLDS: CoverageThresholds = {
    lines: 80,
    branches: 80,
    functions: 80,
    statements: 80
};

@Component({
    selector: 'prism-coverage-panel',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [PrismMetricCardComponent],
    templateUrl: './coverage-panel.component.html',
    styleUrl: './coverage-panel.component.css'
})
export class CoveragePanelComponent {
    readonly activeComponent = input<unknown>(null);

    protected readonly coverage = computed<CoverageData | null>(() => {
        const comp = this.activeComponent() as any;

        return (comp?.meta?.showcaseConfig?.meta?.['coverage'] as CoverageData) ?? null;
    });

    protected readonly thresholds = computed<CoverageThresholds>(() => this.coverage()?.thresholds ?? FALLBACK_THRESHOLDS);

    /** One card per metric, graded against that metric's own threshold, which also marks the bar. */
    protected readonly summaryStats = computed(() => {
        const c = this.coverage();
        const t = this.thresholds();

        if (!c?.found) return [];
        const LABEL = { ok: 'OK', warn: 'Warning', danger: 'Critical' } as const;

        return (
            [
                ['Lines', 'lines'],
                ['Branches', 'branches'],
                ['Functions', 'functions'],
                ['Statements', 'statements']
            ] as const
        ).map(([label, key]) => {
            const detail = c[key];
            const status = coverageMetricTone(detail.pct, t[key]);

            return {
                label,
                pct: detail.pct,
                threshold: t[key],
                tone: toneForStatus(status),
                statusLabel: LABEL[status],
                title: `${label}: ${detail.covered} of ${detail.total} covered · target ${t[key]}%`
            };
        });
    });

    protected readonly files = computed<FileCoverageDetail[]>(() => this.coverage()?.files ?? []);

    protected fileName(path: string): string {
        const parts = path.split('/');

        return parts[parts.length - 1];
    }
}
