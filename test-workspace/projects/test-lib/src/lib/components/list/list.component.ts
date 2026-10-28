import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { Showcase } from '@ng-prism/core';

/**
 * A plain list of `lib-list-item` entries, which `lib-list-group`s can gather under a label.
 *
 * The list renders a `ul` with `role="list"` and projects its items and groups into it. They bring their own styling
 * and their own state, the list only lays them out one under the other.
 *
 * @since 1.7.0
 * @see ListItemComponent
 * @see ListGroupComponent
 * @see ListItemMetaDirective
 * @example
 * ```html
 * <lib-list>
 *   <lib-list-item>Inbox <span libListItemMeta>12</span></lib-list-item>
 *   <lib-list-item (activate)="open()">Drafts</lib-list-item>
 *   <lib-list-item disabled>Archive</lib-list-item>
 * </lib-list>
 * ```
 * @example
 * ```html
 * <lib-list>
 *   <lib-list-group label="Mail">
 *     <lib-list-item>Inbox</lib-list-item>
 *   </lib-list-group>
 *   <lib-list-group label="Archive" [expanded]="false">
 *     <lib-list-item>2025</lib-list-item>
 *   </lib-list-group>
 * </lib-list>
 * ```
 */
@Showcase<ListComponent>({
    title: 'List',
    category: 'Data Display',
    description:
        'A plain list that lays out its `lib-list-item` children, optionally in collapsible `lib-list-group`s. Item, group and the meta text of an item are parts of the list and documented on its page.',
    variants: [
        {
            name: 'Default',
            template:
                '<lib-list-item>Inbox <span libListItemMeta>12</span></lib-list-item><lib-list-item>Drafts <span libListItemMeta>3</span></lib-list-item><lib-list-item disabled>Archive</lib-list-item>'
        },
        {
            name: 'Groups',
            template:
                '<lib-list-group label="Mail"><lib-list-item>Inbox <span libListItemMeta>12</span></lib-list-item><lib-list-item>Sent</lib-list-item></lib-list-group><lib-list-group label="Archive" [expanded]="false"><lib-list-item>2025</lib-list-item><lib-list-item>2024</lib-list-item></lib-list-group>'
        }
    ],
    tags: ['list', 'display']
})
@Component({
    selector: 'lib-list',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    template: `
        <ul class="lib-list" role="list">
            <ng-content />
        </ul>
    `,
    styles: `
        .lib-list {
            display: flex;
            flex-direction: column;
            margin: 0;
            padding: 0;
            list-style: none;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            overflow: hidden;
            min-width: 200px;
        }
    `
})
export class ListComponent {}
