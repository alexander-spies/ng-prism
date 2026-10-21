import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PrismIconComponent } from '../icons/prism-icon.component.js';

/**
 * Identity disclosure for the component head.
 *
 * Selector, description and tags all answer "what is this component", a
 * question you read once on arrival and never again while building. Keeping
 * them permanently on screen cost a 128px band to say something that belongs
 * behind one glyph.
 *
 * A service has no selector, so its code block shows the class name instead,
 * and `facts` carries the plain lines that stand in for the variant and state
 * counts a service does not have.
 *
 * Opening is click-only, through the native Popover API. Escape, click-outside
 * dismissal and top-layer placement come with it declaratively; a hover panel
 * would mean rebuilding all three by hand, and crossing the gap between icon
 * and card without the card closing is its own problem.
 */
@Component({
    selector: 'prism-head-info',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [PrismIconComponent],
    templateUrl: './prism-head-info.component.html',
    styleUrl: './prism-head-info.component.css'
})
export class PrismHeadInfoComponent {
    readonly selector = input<string | undefined>(undefined);
    readonly className = input<string | undefined>(undefined);
    readonly description = input<string | undefined>(undefined);
    readonly tags = input<readonly string[]>([]);
    readonly variantCount = input<number>(0);
    readonly stateCount = input<number>(0);
    readonly facts = input<readonly string[]>([]);

    protected readonly label = computed(() => (this.selector() === undefined ? 'Service details' : 'Component details'));

    protected readonly code = computed(() => {
        const selector = this.selector();

        return selector ? `<${selector}>` : (this.className() ?? '');
    });
}
