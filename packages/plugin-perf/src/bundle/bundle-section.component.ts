import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PrismBadgeComponent, PrismMetricCardComponent, toneForStatus } from '@ng-prism/core';
import type { StatusTone } from '@ng-prism/core/plugin';
import { perfStatus } from '../perf-status.js';
import type { BundleMetrics } from '../perf.types.js';

interface BreakdownRow {
    label: string;
    bytes: number;
    /** Graded against the bundle budget, so its value reads "8.4 / 20 kb". */
    budgeted: boolean;
    /** For comparison only (the whole file), drawn in a muted colour. */
    secondary: boolean;
}

@Component({
    selector: 'perf-bundle-section',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [PrismMetricCardComponent, PrismBadgeComponent],
    templateUrl: './bundle-section.component.html',
    styleUrls: ['../perf-section.css', './bundle-section.component.css']
})
export class BundleSectionComponent {
    readonly metrics = input<BundleMetrics | null>(null);
    readonly warnKb = input(20);
    readonly critKb = input(50);

    /** `stripped` is missing from metrics written before 22.7.0, which measured the whole file. */
    readonly stripped = computed(() => this.metrics()?.stripped === true);

    readonly gzipPercent = computed(() => {
        const m = this.metrics();

        if (!m || m.sourceSize === 0) return 0;
        return Math.round((m.gzipEstimate / m.sourceSize) * 100);
    });

    readonly sourceTitle = computed(() => {
        const m = this.metrics();

        if (!m) return '';

        const budget = `warning above ${this.warnKb()} kb, critical above ${this.critKb()} kb`;

        if (!this.stripped()) return `Whole file: ${this.formatBytes(m.sourceSize)} bytes · ${budget}`;
        return `Without @Showcase and comments: ${this.formatBytes(m.sourceSize)} bytes · whole file ${this.formatBytes(m.rawSourceSize ?? 0)} bytes · ${budget}`;
    });

    readonly gzipTitle = computed(() => {
        const m = this.metrics();

        if (!m) return '';

        const budget = `warning above ${this.warnKb()} kb, critical above ${this.critKb()} kb`;

        if (!this.stripped()) return `About ${this.gzipPercent()}% of the whole file · ${budget}`;
        return `About ${this.gzipPercent()}% of the source without @Showcase and comments · whole file ${this.formatKb(m.rawGzipEstimate ?? 0)} kb gzipped · ${budget}`;
    });

    readonly breakdown = computed<BreakdownRow[]>(() => {
        const m = this.metrics();

        if (!m) return [];

        const rows: BreakdownRow[] = [
            { label: 'source', bytes: m.sourceSize, budgeted: true, secondary: false },
            { label: 'gzip est.', bytes: m.gzipEstimate, budgeted: true, secondary: false }
        ];

        if (m.templateSize) rows.push({ label: 'template', bytes: m.templateSize, budgeted: false, secondary: false });
        if (m.styleSize) rows.push({ label: 'styles', bytes: m.styleSize, budgeted: false, secondary: false });
        if (this.stripped() && m.rawSourceSize !== undefined) rows.push({ label: 'file', bytes: m.rawSourceSize, budgeted: false, secondary: true });
        return rows;
    });

    readonly breakdownLabel = computed(() => (this.stripped() ? 'Size breakdown · without @Showcase & comments' : 'Size breakdown · whole file'));

    readonly breakdownTitle = computed(
        () =>
            `Bars against the warning budget of ${this.warnKb()} kb. Template and styles: the files behind templateUrl and styleUrl(s), ` +
            'which the Angular compiler inlines. File: the whole component file, showcase and comments included.'
    );

    readonly sourceStatus = computed(() => perfStatus((this.metrics()?.sourceSize ?? 0) / 1024, this.warnKb(), this.critKb()));
    readonly gzipStatus = computed(() => perfStatus((this.metrics()?.gzipEstimate ?? 0) / 1024, this.warnKb(), this.critKb()));

    toneOf(tone: StatusTone) {
        return toneForStatus(tone);
    }

    readonly visibleImports = computed(() => {
        const m = this.metrics();

        return m?.importList.slice(0, 10) ?? [];
    });

    readonly hiddenImportCount = computed(() => {
        const m = this.metrics();

        if (!m) return 0;
        return Math.max(0, m.importList.length - 10);
    });

    /** Bar fill against the warning budget: the bar is a quantity, the card above carries the verdict. */
    barPercent(bytes: number): number {
        return Math.min(100, (bytes / 1024 / this.warnKb()) * 100);
    }

    formatBytes(bytes: number): string {
        return bytes.toLocaleString('en-US');
    }

    formatKb(bytes: number): string {
        const kb = bytes / 1024;

        return kb < 10 ? kb.toFixed(1) : Math.round(kb).toString();
    }
}
