import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { BadgeTone } from './badge.types.js';
import { barGeometry } from './metric-bar.js';
import { PrismBadgeComponent } from './prism-badge.component.js';

/**
 * A measured value in a panel: label, status badge, the figure and its unit,
 * optionally a bar with a threshold tick, or a visual of the caller's own in
 * `[metricVisual]` (a ring, a sparkline).
 *
 * No visible subtitle. Details such as bytes, the threshold or the source go in
 * `title`, the card's tooltip. A rated value fills its bar in the status tone;
 * a plain quantity (no `tone`) in the primary colour.
 */
@Component({
    selector: 'prism-metric-card',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [PrismBadgeComponent],
    templateUrl: './prism-metric-card.component.html',
    styleUrl: './prism-metric-card.component.css',
    host: {
        '[attr.title]': 'title()',
        '[attr.data-tone]': 'tone()'
    }
})
export class PrismMetricCardComponent {
    readonly label = input.required<string>();
    readonly value = input.required<string>();
    readonly unit = input<string | null>(null);
    readonly tone = input<BadgeTone | null>(null);
    readonly statusLabel = input<string | null>(null);
    /** Bar fill, 0–1. No bar without it. */
    readonly fraction = input<number | null>(null);
    /** Threshold tick, 0–1. */
    readonly threshold = input<number | null>(null);
    readonly title = input<string | null>(null);

    protected readonly bar = computed(() => {
        const fraction = this.fraction();

        return fraction === null ? null : barGeometry(fraction, this.threshold() ?? undefined);
    });
}
