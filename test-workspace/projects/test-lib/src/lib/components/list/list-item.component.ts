import { booleanAttribute, ChangeDetectionStrategy, Component, input, output, ViewEncapsulation } from '@angular/core';
import { Showcase } from '@ng-prism/core';

/**
 * One entry of a `lib-list`.
 *
 * The item is clickable: it emits `activate` on a click, unless it is `disabled`. A disabled item is dimmed, announced
 * as disabled and ignores clicks.
 *
 * @since 1.7.0
 * @see ListComponent
 * @example
 * ```html
 * <lib-list>
 *   <lib-list-item (activate)="open()">Drafts</lib-list-item>
 *   <lib-list-item disabled>Archive</lib-list-item>
 * </lib-list>
 * ```
 */
@Showcase<ListItemComponent>({
    title: 'List Item',
    partOf: 'lib-list',
    description: 'One entry of a lib-list.',
    tags: ['list', 'item']
})
@Component({
    selector: 'lib-list-item',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: {
        class: 'lib-list-item',
        role: 'listitem',
        '[class.lib-list-item--disabled]': 'disabled()',
        '[attr.aria-disabled]': 'disabled() || null',
        '(click)': 'onClick()'
    },
    template: `<ng-content />`,
    styles: `
        .lib-list-item {
            display: block;
            padding: 10px 14px;
            font-size: 14px;
            color: #374151;
            background: #ffffff;
            cursor: pointer;
        }
        .lib-list-item + .lib-list-item {
            border-top: 1px solid #e5e7eb;
        }
        .lib-list-item:hover {
            background: #f9fafb;
        }
        .lib-list-item--disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .lib-list-item--disabled:hover {
            background: #ffffff;
        }
    `
})
export class ListItemComponent {
    /** Whether the item is dimmed and ignores clicks. */
    readonly disabled = input(false, { transform: booleanAttribute });

    /** Emits when the item is clicked while it is not disabled. */
    readonly activate = output<void>();

    protected onClick(): void {
        if (!this.disabled()) this.activate.emit();
    }
}
