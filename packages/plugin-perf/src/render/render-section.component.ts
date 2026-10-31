import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { type BadgeTone, PrismMetricCardComponent, toneForStatus } from '@ng-prism/core';
import { perfStatus } from '../perf-status.js';
import type { PerfRenderService } from './perf-render.service.js';
import { SparklineComponent } from './sparkline.component.js';

@Component({
    selector: 'perf-render-section',
    standalone: true,
    imports: [SparklineComponent, PrismMetricCardComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './render-section.component.html',
    styleUrl: '../perf-section.css'
})
export class RenderSectionComponent {
    readonly renderService = input.required<PerfRenderService>();
    readonly warnMs = input(5);
    readonly critMs = input(16);

    formatMs(value: number | null): string {
        if (value === null) return '—';
        return value < 10 ? value.toFixed(2) : value.toFixed(1);
    }

    /** A measured render time graded against the budget; `null` when there is nothing to grade. */
    statusOf(value: number | null): { tone: BadgeTone; label: string } | null {
        if (value === null) return null;
        const status = perfStatus(value, this.warnMs(), this.critMs());

        return { tone: toneForStatus(status.tone), label: status.label };
    }

    budgetTitle(what: string): string {
        return `${what} · warning above ${this.warnMs()} ms, critical above ${this.critMs()} ms`;
    }
}
