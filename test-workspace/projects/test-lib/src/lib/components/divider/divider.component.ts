import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Showcase } from '@ng-prism/core';

/** Direction of a divider: a horizontal rule or a vertical separator. */
export type DividerOrientationType = 'horizontal' | 'vertical';

/** Visual weight of a divider's colour: `dark` is more prominent than `default`. */
export type DividerVariantType = 'default' | 'dark';

/**
 * Divider line that visually separates content.
 *
 * Use `orientation` to switch between a horizontal rule (default) and a
 * vertical separator. `variant` controls the visual treatment, `bold`
 * thickens the line.
 *
 * The host carries `role="separator"` with `aria-orientation` reflecting
 * the current `orientation` input.
 *
 * @example
 * ```html
 * <lib-divider />
 * <lib-divider orientation="vertical" />
 * <lib-divider variant="dark" />
 * ```
 *
 * @since 1.0.0
 */
@Showcase({
    title: 'Divider',
    status: 'stable',
    category: 'Layout',
    description: 'Horizontal or vertical divider line with variant and weight options.',
    tags: ['divider', 'separator', 'hr', 'layout'],
    variants: [
        {
            name: 'Horizontal',
            inputs: { orientation: 'horizontal' },
            canvasLayout: 'stretch'
        },
        {
            name: 'Horizontal Dark',
            inputs: { orientation: 'horizontal', variant: 'dark' },
            canvasLayout: 'stretch'
        },
        {
            name: 'Horizontal Bold',
            inputs: { orientation: 'horizontal', bold: true },
            canvasLayout: 'stretch'
        },
        { name: 'Vertical', inputs: { orientation: 'vertical' } },
        { name: 'Vertical Bold', inputs: { orientation: 'vertical', bold: true } }
    ]
})
@Component({
    selector: 'lib-divider',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: '',
    host: {
        role: 'separator',
        '[attr.aria-orientation]': 'orientation()',
        '[class.divider--horizontal]': 'orientation() === "horizontal"',
        '[class.divider--vertical]': 'orientation() === "vertical"',
        '[class.divider--dark]': 'variant() === "dark"',
        '[class.divider--bold]': 'bold()'
    },
    styles: `
        :host(.divider--horizontal) {
            display: block;
            margin: 12px 0;
            border-bottom: 2px solid #d4d4d8;
        }

        :host(.divider--horizontal.divider--bold) {
            border-bottom-width: 4px;
        }

        :host(.divider--horizontal.divider--dark) {
            border-bottom-color: #52525b;
        }

        :host(.divider--vertical) {
            display: inline-block;
            align-self: stretch;
            min-height: 1em;
            border-left: 1px solid #d4d4d8;
        }

        :host(.divider--vertical.divider--bold) {
            border-left-width: 2px;
        }

        :host(.divider--vertical.divider--dark) {
            border-left-color: #52525b;
        }
    `
})
export class DividerComponent {
    /** Renders a thicker, bolder line. */
    readonly bold = input<boolean>(false);

    /** Orientation of the divider. */
    readonly orientation = input<DividerOrientationType>('horizontal');

    /** Visual variant: `'default'` or `'dark'` (more prominent). */
    readonly variant = input<DividerVariantType>('default');
}
