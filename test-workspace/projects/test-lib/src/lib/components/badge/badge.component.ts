import { ChangeDetectionStrategy, Component, computed, input, ViewEncapsulation } from '@angular/core';
import { Showcase } from '@ng-prism/core';

/** Semantic colour of a badge. `default` is neutral, the others carry a status. */
export type BadgeVariantType = 'default' | 'success' | 'warning' | 'error' | 'info';

/**
 * Small pill that labels a status or a count.
 *
 * ## Variants
 *
 * - `default`: neutral labels such as "New" or a plain count
 * - `success`, `warning`, `error`: the outcome of a check, e.g. "3 passed"
 * - `info`: hints such as "Beta"
 *
 * Keep the text to a word, two at most, or a number. A longer message belongs in an `AlertComponent`.
 *
 * @since 1.0.0
 * @see AlertComponent
 * @example
 * ```html
 * <sg-badge text="Beta" variant="info" />
 * ```
 * @example
 * ```html
 * <h3>Inbox <sg-badge [text]="unread().toString()" /></h3>
 * ```
 */
@Showcase({
    title: 'Badge',
    status: 'stable',
    category: 'Data Display',
    description: 'Status indicator badge with multiple semantic variants.',
    variants: [
        { name: 'Default', inputs: { text: 'New', variant: 'default' } },
        { name: 'Success', inputs: { text: '3 passed', variant: 'success' } },
        { name: 'Warning', inputs: { text: 'Pending', variant: 'warning' } },
        { name: 'Error', inputs: { text: '5 errors', variant: 'error' } },
        { name: 'Info', inputs: { text: 'Beta', variant: 'info' } },
        { name: 'Numeric', inputs: { text: '42', variant: 'default' } }
    ],
    tags: ['display', 'badge', 'status', 'indicator']
})
@Component({
    selector: 'sg-badge',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: {
        class: 'sg-badge',
        '[attr.data-variant]': 'variant()'
    },
    template: `<span class="sg-badge__text">{{ text() }}</span>`,
    styles: `
        .sg-badge {
            display: inline-flex;
            align-items: center;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 12px;
            font-weight: 600;
            line-height: 1.4;
        }
        .sg-badge[data-variant='default'] {
            background: #e5e7eb;
            color: #374151;
        }
        .sg-badge[data-variant='success'] {
            background: #d1fae5;
            color: #065f46;
        }
        .sg-badge[data-variant='warning'] {
            background: #fef3c7;
            color: #92400e;
        }
        .sg-badge[data-variant='error'] {
            background: #fee2e2;
            color: #991b1b;
        }
        .sg-badge[data-variant='info'] {
            background: #dbeafe;
            color: #1e40af;
        }
    `
})
export class BadgeComponent {
    /** Text inside the badge. A count works too, passed as a string. */
    readonly text = input.required<string>();

    /** Semantic colour of the badge, see `BadgeVariantType`. */
    readonly variant = input<BadgeVariantType>('default');

    protected readonly ariaLabel = computed(() => `${this.variant()} badge: ${this.text()}`);
}
