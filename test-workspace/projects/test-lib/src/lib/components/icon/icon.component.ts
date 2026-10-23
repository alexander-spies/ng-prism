import { ChangeDetectionStrategy, Component, computed, input, ViewEncapsulation } from '@angular/core';

/** Names of the icons `lib-icon` draws. */
export type IconNameType = 'search' | 'mail' | 'eye';

const ICON_PATHS: Record<IconNameType, string> = {
    search: 'M11 4a7 7 0 1 0 0 14 7 7 0 1 0 0-14ZM20 20l-3.5-3.5',
    mail: 'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1ZM3 7l9 6 9-6',
    eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12ZM12 9a3 3 0 1 0 0 6 3 3 0 1 0 0-6Z'
};

/**
 * A small line icon in the current text color, hidden from assistive technology.
 *
 * `lib-icon` has no showcase of its own: it appears in the compositions of the `Form Field` showcase, which imports it
 * from the library by its selector.
 *
 * @since 1.6.0
 * @example
 * ```html
 * <lib-form-field label="Search">
 *   <lib-icon libPrefix name="search" />
 *   <input libInput />
 * </lib-form-field>
 * ```
 */
@Component({
    selector: 'lib-icon',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { class: 'lib-icon', 'aria-hidden': 'true' },
    template: `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path [attr.d]="path()" />
        </svg>
    `,
    styles: `
        .lib-icon {
            display: inline-flex;
            flex: none;
        }
    `
})
export class IconComponent {
    /** Which icon to draw, see {@link IconNameType}. */
    readonly name = input.required<IconNameType>();

    protected readonly path = computed(() => ICON_PATHS[this.name()]);
}
