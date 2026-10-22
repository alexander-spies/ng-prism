import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { BadgeTone } from './badge.types.js';

/**
 * The one badge of the styleguide chrome.
 *
 * Words are set in the sans face and never in capitals; only `value` is mono,
 * with tabular figures, so numbers line up. `soft` fills with the tone's `-bg`
 * tint, `outline` draws its contour instead; both keep 4.5:1 for the text.
 */
@Component({
    selector: 'prism-badge',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './prism-badge.component.html',
    styleUrl: './prism-badge.component.css',
    host: {
        '[class]': "'prism-badge prism-badge--' + tone() + ' prism-badge--' + variant() + ' prism-badge--' + size()"
    }
})
export class PrismBadgeComponent {
    readonly tone = input<BadgeTone>('neutral');
    readonly variant = input<'soft' | 'outline'>('soft');
    readonly size = input<'sm' | 'md'>('md');
    /** A leading dot in the tone's colour. */
    readonly dot = input(false, { transform: booleanAttribute });
    readonly label = input<string | null>(null);
    readonly value = input<string | null>(null);
}
