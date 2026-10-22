import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PrismBadgeComponent, PrismMetricCardComponent, toneForStatus } from '@ng-prism/core';
import type { StatusTone } from '@ng-prism/core/plugin';
import { perfStatus } from '../perf-status.js';
import type { BundleMetrics } from '../perf.types.js';

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

    readonly gzipPercent = computed(() => {
        const m = this.metrics();

        if (!m || m.sourceSize === 0) return 0;
        return Math.round((m.gzipEstimate / m.sourceSize) * 100);
    });

    /** Bar fill against the warning budget: the bar is a quantity, the card above carries the verdict. */
    readonly sourceBarPercent = computed(() => {
        const m = this.metrics();

        return m ? Math.min(100, (m.sourceSize / 1024 / this.warnKb()) * 100) : 0;
    });

    readonly gzipBarPercent = computed(() => {
        const m = this.metrics();

        return m ? Math.min(100, (m.gzipEstimate / 1024 / this.warnKb()) * 100) : 0;
    });

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

    formatBytes(bytes: number): string {
        return bytes.toLocaleString('en-US');
    }

    formatKb(bytes: number): string {
        const kb = bytes / 1024;

        return kb < 10 ? kb.toFixed(1) : Math.round(kb).toString();
    }
}
