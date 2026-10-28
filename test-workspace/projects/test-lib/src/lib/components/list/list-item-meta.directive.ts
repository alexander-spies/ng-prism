import { Directive } from '@angular/core';
import { Showcase } from '@ng-prism/core';

/**
 * Secondary text at the end of a `lib-list-item`, such as a count or a date.
 *
 * Put it on a `span` inside the item: the item lays out its content in a row, and the meta text moves to the far end
 * of it, smaller and grey. The styles come with `lib-list-item`.
 *
 * @since 1.7.0
 * @see ListItemComponent
 * @example
 * ```html
 * <lib-list-item>Inbox <span libListItemMeta>12</span></lib-list-item>
 * ```
 */
@Showcase({
    title: 'List Item Meta',
    partOf: 'lib-list',
    // The element the usage line on the API tab puts the directive on.
    host: '<span>12</span>',
    description: 'Secondary text at the end of a list item, such as a count or a date.',
    tags: ['list', 'meta', 'directive']
})
@Directive({
    selector: '[libListItemMeta]',
    standalone: true,
    host: { class: 'lib-list-item__meta' }
})
export class ListItemMetaDirective {}
