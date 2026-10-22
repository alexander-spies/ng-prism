import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { MetricVariant } from './head-metrics.js';

/**
 * One row of the gauge's readout: metric, threshold, value. The three columns
 * line up with the readout's header row through the shared grid template.
 */
@Component({
    selector: 'prism-stat',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './prism-stat.component.html',
    styleUrl: './prism-stat.component.css'
})
export class PrismStatComponent {
    readonly label = input.required<string>();
    readonly threshold = input('');
    readonly value = input.required<string | number>();
    readonly variant = input<MetricVariant>('ok');
}
