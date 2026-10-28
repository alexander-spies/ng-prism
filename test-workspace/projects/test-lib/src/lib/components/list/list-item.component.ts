import { booleanAttribute, ChangeDetectionStrategy, Component, input, output, ViewEncapsulation } from '@angular/core';
import { Showcase } from '@ng-prism/core';

/**
 * One entry of a `lib-list`.
 *
 * The item holds a native button: it emits `activate` on a click, or on Enter or Space once it has focus, unless it is
 * `disabled`. A disabled item is dimmed, and its button is disabled, so it ignores clicks and is out of the tab order.
 * The button lays out the content in a row, so a `span` with `libListItemMeta` ends up at its far end.
 *
 * @since 1.7.0
 * @see ListComponent
 * @see ListItemMetaDirective
 * @example
 * ```html
 * <lib-list>
 *   <lib-list-item (activate)="open()">Drafts <span libListItemMeta>3</span></lib-list-item>
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
        role: 'listitem'
    },
    template: `
        <button class="lib-list-item__action" type="button" [disabled]="disabled()" (click)="activate.emit()">
            <ng-content />
        </button>
    `,
    styles: `
        .lib-list-item {
            display: block;
        }
        .lib-list-item + .lib-list-item {
            border-top: 1px solid #e5e7eb;
        }
        .lib-list-item__action {
            display: flex;
            align-items: center;
            gap: 12px;
            width: 100%;
            margin: 0;
            padding: 10px 14px;
            border: 0;
            font: inherit;
            font-size: 14px;
            color: #374151;
            text-align: start;
            background: #ffffff;
            cursor: pointer;
        }
        .lib-list-item__action:hover {
            background: #f9fafb;
        }
        .lib-list-item__action:focus-visible {
            outline: 2px solid #6366f1;
            outline-offset: -2px;
        }
        .lib-list-item__action:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .lib-list-item__action:disabled:hover {
            background: #ffffff;
        }
        .lib-list-item__meta {
            margin-inline-start: auto;
            font-size: 12px;
            color: #6b7280;
        }
    `
})
export class ListItemComponent {
    /** Whether the item is dimmed and its button disabled, so that it ignores clicks and keyboard focus. */
    readonly disabled = input(false, { transform: booleanAttribute });

    /** Emits when the item is clicked, or activated with Enter or Space, while it is not disabled. */
    readonly activate = output<void>();
}
