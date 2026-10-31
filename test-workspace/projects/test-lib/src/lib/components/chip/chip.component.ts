import { ChangeDetectionStrategy, Component, input, output, ViewEncapsulation } from '@angular/core';
import { Showcase } from '@ng-prism/core';

/**
 * Compact label for tags and filters, optionally selected or removable.
 *
 * ## States
 *
 * - **Selected**: highlighted, e.g. an active filter
 * - **Removable**: shows a remove button that emits `removed` with the chip's label
 * - **Disabled**: dimmed, and the remove button is hidden
 *
 * The chip does not remove itself. Listen to `removed` and drop the entry from your list.
 *
 * @since 1.0.0
 * @see BadgeComponent
 * @example
 * ```html
 * <sg-chip label="Angular" [selected]="true" />
 * ```
 * @example
 * ```html
 * <sg-chip [label]="tag" [removable]="true" (removed)="removeTag($event)" />
 * ```
 */
@Showcase({
    title: 'Chip',
    status: 'beta',
    category: 'Data Display',
    description: 'Compact element for tags and filters with optional removable state.',
    // Only the removable variants render the remove button, so the state fits those and leaves the rest empty.
    states: [{ name: 'Remove hovered', pseudo: { hover: '.sg-chip__remove' } }],
    variants: [
        { name: 'Default', inputs: { label: 'Angular' } },
        { name: 'Removable', inputs: { label: 'TypeScript', removable: true } },
        { name: 'Selected', inputs: { label: 'Active', selected: true } },
        { name: 'Selected Removable', inputs: { label: 'Filter', selected: true, removable: true } },
        { name: 'Disabled', inputs: { label: 'Locked', disabled: true } }
    ],
    tags: ['display', 'chip', 'tag', 'filter']
})
@Component({
    selector: 'sg-chip',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: {
        class: 'sg-chip',
        '[class.sg-chip--selected]': 'selected()',
        '[class.sg-chip--disabled]': 'disabled()'
    },
    template: `
        <span class="sg-chip__label">{{ label() }}</span>
        @if (removable() && !disabled()) {
            <button class="sg-chip__remove" aria-label="Remove" (click)="removed.emit(label())">
                <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                    <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" stroke-width="1.5" fill="none" />
                </svg>
            </button>
        }
    `,
    styles: `
        .sg-chip {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px 10px;
            border-radius: 16px;
            font-size: 13px;
            background: #f3f4f6;
            color: #374151;
            border: 1px solid #e5e7eb;
            transition: all 0.15s;
        }
        .sg-chip--selected {
            background: #eef2ff;
            color: #4338ca;
            border-color: #c7d2fe;
        }
        .sg-chip--disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .sg-chip__remove {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            border: none;
            background: transparent;
            color: inherit;
            cursor: pointer;
            padding: 0;
            transition: background 0.15s;
        }
        .sg-chip__remove:hover {
            background: rgba(0, 0, 0, 0.08);
        }
    `
})
export class ChipComponent {
    /** Dims the chip and hides its remove button. `remove()` does nothing while it is set. */
    readonly disabled = input<boolean>(false);

    /** Shows a remove button. Hidden while the chip is `disabled`. */
    readonly removable = input<boolean>(false);

    /** Highlights the chip, e.g. as an active filter. */
    readonly selected = input<boolean>(false);

    /** Text of the chip, and the value `removed` emits. */
    readonly label = input.required<string>();

    /** Emits the chip's `label` when the remove button is clicked or `remove()` is called. */
    readonly removed = output<string>();

    /** Emits `removed` as if the remove button was clicked. Does nothing while the chip is `disabled`. */
    remove(): void {
        if (!this.disabled()) {
            this.removed.emit(this.label());
        }
    }
}
