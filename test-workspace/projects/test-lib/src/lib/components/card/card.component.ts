import { ChangeDetectionStrategy, Component, input, output, ViewEncapsulation } from '@angular/core';
import { Showcase } from '@ng-prism/core';

/**
 * Surface that groups a title, a short text and an optional image.
 *
 * ## Modes
 *
 * - **Elevated** (default): a soft shadow lifts the card off the page
 * - **Outlined**: `[elevated]="false"` swaps the shadow for a border
 * - **Clickable**: `clickable` adds a hover style, a pointer cursor and the `clicked` output
 *
 * A clickable card listens for clicks on its host element. It is not a button, so keyboard users
 * still need a real link or button inside it.
 *
 * @since 1.0.0
 * @example
 * ```html
 * <sg-card title="Quarterly report" subtitle="Updated 2 hours ago" />
 * ```
 * @example
 * ```html
 * <sg-card
 *   title="Open project"
 *   subtitle="Last edited by Jane"
 *   [clickable]="true"
 *   (clicked)="open()" />
 * ```
 */
@Showcase({
    title: 'Card',
    status: 'stable',
    category: 'Layout',
    description: 'Content card with optional title, subtitle, image placeholder, and interactive state.',
    // The hover style hangs off .sg-card--clickable, which only clickable cards carry.
    states: [{ name: 'Hover', pseudo: { hover: '.sg-card--clickable' } }],
    variants: [
        { name: 'Basic', inputs: { title: 'Card Title', subtitle: 'A brief description of the content.' } },
        { name: 'With Image', inputs: { title: 'Featured', subtitle: 'Image card variant.', showImage: true } },
        { name: 'Clickable', inputs: { title: 'Interactive Card', subtitle: 'Click me.', clickable: true } },
        { name: 'Elevated', inputs: { title: 'Elevated Card', subtitle: 'With shadow.', elevated: true } },
        { name: 'Outlined', inputs: { title: 'Outlined', subtitle: 'Border only.', elevated: false } }
    ],
    tags: ['layout', 'card', 'container', 'surface']
})
@Component({
    selector: 'sg-card',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: {
        class: 'sg-card',
        '[class.sg-card--clickable]': 'clickable()',
        '[class.sg-card--elevated]': 'elevated()',
        '(click)': 'onClick()'
    },
    template: `
        @if (showImage()) {
            <div class="sg-card__image">
                <svg viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="400" height="200" fill="#e5e7eb" />
                    <path d="M170 110l30-40 30 40z" fill="#9ca3af" />
                    <circle cx="180" cy="80" r="12" fill="#9ca3af" />
                </svg>
            </div>
        }
        <div class="sg-card__body">
            @if (title()) {
                <h3 class="sg-card__title">{{ title() }}</h3>
            }
            @if (subtitle()) {
                <p class="sg-card__subtitle">{{ subtitle() }}</p>
            }
        </div>
    `,
    styles: `
        .sg-card {
            display: block;
            border-radius: 12px;
            overflow: hidden;
            background: #fff;
            border: 1px solid #e5e7eb;
            transition: box-shadow 0.2s;
            max-width: 320px;
        }
        .sg-card--elevated {
            border-color: transparent;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }
        .sg-card--clickable {
            cursor: pointer;
        }
        .sg-card--clickable:hover {
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
        }
        .sg-card__image svg {
            display: block;
            width: 100%;
            height: auto;
        }
        .sg-card__body {
            padding: 16px;
        }
        .sg-card__title {
            margin: 0 0 4px;
            font-size: 16px;
            font-weight: 600;
            color: #111827;
        }
        .sg-card__subtitle {
            margin: 0;
            font-size: 13px;
            color: #6b7280;
            line-height: 1.5;
        }
    `
})
export class CardComponent {
    /** Heading of the card. Left out when empty. */
    readonly title = input<string>('');

    /** Short text below the title. Left out when empty. */
    readonly subtitle = input<string>('');

    /** Adds an image area above the text, filled with a placeholder graphic. */
    readonly showImage = input<boolean>(false);

    /** Makes the whole card react to clicks: hover style, pointer cursor and the `clicked` output. */
    readonly clickable = input<boolean>(false);

    /** Lifts the card with a shadow. `false` draws a border instead. */
    readonly elevated = input<boolean>(true);

    /** Emits when a `clickable` card is clicked. Never emits otherwise. */
    readonly clicked = output<void>();

    /** Handles a click on the host and emits `clicked` while the card is `clickable`. */
    onClick(): void {
        if (this.clickable()) {
            this.clicked.emit();
        }
    }
}
