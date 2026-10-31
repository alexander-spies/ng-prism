import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { PrismIconComponent } from '../icons/prism-icon.component.js';
import { PrismMeasureService } from '../services/prism-measure.service.js';
import { PrismMobileLayoutService } from '../services/prism-mobile-layout.service.js';
import { formatMeasure, measureDistance } from './measure-geometry.js';

/**
 * The pinned measurements, as a row below the canvas.
 *
 * Not a panel in a corner of the stage: the top overlay band already carries
 * the background pill on the left, the viewport dimension line in the
 * middle and the toolrail on the right. A fourth floating surface there
 * would be the first one to collide with another.
 *
 * A direct child of `.prism-canvas-wrap` and therefore without a capture
 * guard of its own: `CAPTURE_CANVAS_ONLY_SELECTOR` structurally removes
 * every child of the wrap that does not contain the stage. The rule is
 * deliberately written structurally rather than as a list of selectors, so
 * exactly this case works without anyone maintaining it.
 */
@Component({
    selector: 'prism-canvas-pin-row',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [PrismIconComponent],
    templateUrl: './prism-canvas-pin-row.component.html',
    styleUrl: './prism-canvas-pin-row.component.css'
})
export class PrismCanvasPinRowComponent {
    private readonly measure = inject(PrismMeasureService);
    private readonly mobileLayout = inject(PrismMobileLayoutService);

    /** None in the phone layout, which leaves the measuring tool out; the pins stay and come back on the desktop. */
    protected readonly chips = computed(() => (this.mobileLayout.mobile() ? [] : this.measure.pins().map((m) => `${formatMeasure(measureDistance(m.a, m.b))} px`)));

    protected remove(index: number): void {
        this.measure.removePin(index);
    }
}
