import { ChangeDetectionStrategy, Component, input, output, ViewEncapsulation } from '@angular/core';
import { Showcase } from '@ng-prism/core';

/**
 * A compact chip element for tags, filters, or selections with optional remove action.
 * @since 1.0.0
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
    readonly label = input.required<string>();
    readonly removable = input<boolean>(false);
    readonly selected = input<boolean>(false);
    readonly disabled = input<boolean>(false);
    readonly removed = output<string>();

    /** Programmatically triggers the remove event. */
    remove(): void {
        if (!this.disabled()) {
            this.removed.emit(this.label());
        }
    }
}
