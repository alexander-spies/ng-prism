import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { StatusTone } from '../../../plugin/status.js';

const R = 54;
const CIRCUMFERENCE = 2 * Math.PI * R;

/**
 * The a11y score as a ring, drawn in the status tone of the grade rather than
 * the brand gradient: a rated value takes its verdict's colour everywhere. The
 * figure itself is set by the metric card around it.
 */
@Component({
    selector: 'prism-a11y-score',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './a11y-score.component.html',
    styleUrl: './a11y-score.component.css',
    host: { '[attr.data-tone]': 'tone()', 'aria-hidden': 'true' }
})
export class A11yScoreComponent {
    readonly score = input.required<number>();
    readonly tone = input<StatusTone>('ok');

    protected readonly R = R;
    protected readonly CIRC = CIRCUMFERENCE;

    protected readonly dashOffset = computed(() => CIRCUMFERENCE - (Math.max(0, Math.min(100, this.score())) / 100) * CIRCUMFERENCE);
}
