import { ChangeDetectionStrategy, Component, input, model, ViewEncapsulation } from '@angular/core';
import { Showcase } from '@ng-prism/core';

/**
 * A labelled group of `lib-list-item` entries inside a `lib-list`.
 *
 * The label is a button that collapses the group to its label and expands it again. `expanded` is a model: bind it
 * with `[(expanded)]`, or listen to `expandedChange`. The label carries `aria-expanded`, and the items of the group
 * sit in a list of their own.
 *
 * @since 1.7.0
 * @see ListComponent
 * @example
 * ```html
 * <lib-list>
 *   <lib-list-group label="Mail" [(expanded)]="mailOpen">
 *     <lib-list-item>Inbox</lib-list-item>
 *   </lib-list-group>
 * </lib-list>
 * ```
 */
@Showcase<ListGroupComponent>({
    title: 'List Group',
    partOf: 'lib-list',
    status: 'beta',
    description: 'A labelled group of items in a lib-list that collapses to its label.',
    tags: ['list', 'group', 'collapsible']
})
@Component({
    selector: 'lib-list-group',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: {
        class: 'lib-list-group',
        role: 'listitem'
    },
    template: `
        <button class="lib-list-group__label" type="button" [attr.aria-expanded]="expanded()" (click)="expanded.set(!expanded())">
            {{ label() }}
        </button>
        <div class="lib-list-group__items" role="list" [hidden]="!expanded()">
            <ng-content />
        </div>
    `,
    styles: `
        .lib-list-group {
            display: block;
        }
        .lib-list-group + .lib-list-group,
        .lib-list-item + .lib-list-group,
        .lib-list-group + .lib-list-item {
            border-top: 1px solid #e5e7eb;
        }
        .lib-list-group__label {
            display: flex;
            align-items: center;
            gap: 8px;
            width: 100%;
            margin: 0;
            padding: 8px 14px;
            border: 0;
            font: inherit;
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            color: #6b7280;
            text-align: start;
            background: #f9fafb;
            cursor: pointer;
        }
        .lib-list-group__label::before {
            content: '';
            width: 6px;
            height: 6px;
            border-right: 1.5px solid currentcolor;
            border-bottom: 1.5px solid currentcolor;
            transform: rotate(45deg);
            transition: transform 0.15s;
        }
        .lib-list-group__label[aria-expanded='false']::before {
            transform: rotate(-45deg);
        }
        .lib-list-group__label:focus-visible {
            outline: 2px solid #6366f1;
            outline-offset: -2px;
        }
        .lib-list-group__items {
            border-top: 1px solid #e5e7eb;
        }
        .lib-list-group__items[hidden] {
            display: none;
        }
    `
})
export class ListGroupComponent {
    /** Whether the items of the group are shown. Two-way bindable with `[(expanded)]`; the label toggles it. */
    readonly expanded = model(true);

    /** Text of the label, which also names the group's items for assistive technology. */
    readonly label = input.required<string>();
}
