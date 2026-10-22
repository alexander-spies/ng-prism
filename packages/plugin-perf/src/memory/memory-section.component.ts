import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { type BadgeTone, PrismBadgeComponent, PrismMetricCardComponent } from '@ng-prism/core';
import type { PerfMemoryService } from './perf-memory.service.js';

@Component({
    selector: 'perf-memory-section',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [PrismMetricCardComponent, PrismBadgeComponent],
    templateUrl: './memory-section.component.html',
    styleUrl: '../perf-section.css'
})
export class MemorySectionComponent {
    readonly memoryService = input.required<PerfMemoryService>();

    private readonly maxBytes = computed(() => {
        const svc = this.memoryService();
        const vals = [svc.beforeCreate()?.bytes ?? 0, svc.afterCreate()?.bytes ?? 0, svc.afterDestroy()?.bytes ?? 0];

        return Math.max(...vals);
    });

    readonly deltaText = computed(() => {
        const d = this.memoryService().delta();

        if (d === null) return '';
        return `+${this.formatMb(d)} MB delta`;
    });

    readonly residualText = computed(() => {
        const r = this.memoryService().residual();

        if (r === null) return '';
        return `+${this.formatMb(r)} MB residual`;
    });

    /** A heap that grew on create is worth a look, not a verdict. */
    readonly afterCreateTone = computed<BadgeTone | null>(() => {
        const d = this.memoryService().delta();

        return d !== null && d > 0 ? 'warn' : null;
    });

    /** Whether the heap came back after destroy: the leak verdict. */
    readonly destroyTone = computed<BadgeTone | null>(() => {
        const svc = this.memoryService();

        if (!svc.afterDestroy()) return null;
        const status = svc.leakStatus();

        if (status === 'ok') return 'success';
        if (status === 'warn') return 'danger';
        return null;
    });

    barPercent(bytes: number | undefined): number {
        if (!bytes || this.maxBytes() === 0) return 0;
        return (bytes / this.maxBytes()) * 100;
    }

    formatMb(bytes: number | null | undefined): string {
        if (bytes === null || bytes === undefined) return '—';
        return (bytes / (1024 * 1024)).toFixed(1);
    }
}
