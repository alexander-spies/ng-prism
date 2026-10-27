import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { Showcase } from '@ng-prism/core';

/**
 * A plain list of `lib-list-item` entries.
 *
 * The list renders a `ul` with `role="list"` and projects its items into it. The items bring their own styling and
 * their disabled state, the list only lays them out one under the other.
 *
 * @since 1.7.0
 * @see ListItemComponent
 * @example
 * ```html
 * <lib-list>
 *   <lib-list-item>Inbox</lib-list-item>
 *   <lib-list-item (activate)="open()">Drafts</lib-list-item>
 *   <lib-list-item disabled>Archive</lib-list-item>
 * </lib-list>
 * ```
 */
@Showcase<ListComponent>({
    title: 'List',
    category: 'Data Display',
    description: 'A plain list that lays out its `lib-list-item` children. The item is a part of the list and documented on its page.',
    variants: [
        {
            name: 'Default',
            template: '<lib-list-item>Inbox</lib-list-item><lib-list-item>Drafts</lib-list-item><lib-list-item disabled>Archive</lib-list-item>'
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
