import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Showcase } from '@ng-prism/core';

export type ButtonVariantType = 'filled' | 'outlined' | 'elevated' | 'text' | 'icon-only';

/**
 * Flexible button component with five visual variants.
 *
 * ## Variants
 *
 * - `filled`: primary actions, highest emphasis
 * - `outlined`: secondary actions
 * - `elevated`: floating actions on neutral surfaces
 * - `text`: low-emphasis actions, e.g. dialog buttons
 * - `icon-only`: compact actions, label replaced by an icon
 *
 * Supports `label` text, `icon-only` mode, and the `disabled`/`readonly` states.
 * See **[ButtonVariantType](#)** for the full type union.
 *
 * @since 1.0.0
 * @see ButtonVariantType
 * @example
 * ```html
 * <lib-button label="Save" variant="filled" />
 * ```
 * @example
 * ```html
 * <lib-button variant="icon-only" icon="★" />
 * ```
 */
@Showcase({
    title: 'Button',
    status: 'stable',
    category: 'Inputs',
    categoryOrder: 1,
    componentOrder: 1,
    description: 'Flexible button with five visual variants.',
    meta: {
        figma: 'https://www.figma.com/design/rCsBVcHJmKQYmbFQi71DO2/%F0%9F%93%99-Component-Library?node-id=1796-2778&m=dev',
        a11y: {
            rules: { region: { enabled: false } }
        }
    },
    variants: [
        {
            name: 'Filled',
            inputs: { variant: 'filled', label: 'Filled' },
            bg: 'light',
            meta: {
                figma: 'https://www.figma.com/design/rCsBVcHJmKQYmbFQi71DO2/%F0%9F%93%99-Component-Library?node-id=1796-2779&m=dev'
            }
        },
        {
            name: 'Outlined',
            inputs: { variant: 'outlined', label: 'Outlined' },
            meta: {
                figma: 'https://www.figma.com/design/rCsBVcHJmKQYmbFQi71DO2/%F0%9F%93%99-Component-Library?node-id=1796-2812&m=dev'
            }
        },
        {
            name: 'Elevated',
            inputs: { variant: 'elevated', label: 'Elevated' },
            meta: {
                figma: 'https://www.figma.com/design/rCsBVcHJmKQYmbFQi71DO2/%F0%9F%93%99-Component-Library?node-id=5117-31054&m=dev'
            }
        },
        {
            name: 'Text',
            inputs: { variant: 'text', label: 'Text' },
            meta: {
                figma: 'https://www.figma.com/design/rCsBVcHJmKQYmbFQi71DO2/%F0%9F%93%99-Component-Library?node-id=1796-2782'
            }
        },
        {
            name: 'Icon Only',
            inputs: { variant: 'icon-only', icon: '★' },
            meta: {
                figma: 'https://www.figma.com/design/rCsBVcHJmKQYmbFQi71DO2/%F0%9F%93%99-Component-Library?node-id=1796-2783'
            }
        },
        {
            name: 'Disabled',
            inputs: { variant: 'filled', label: 'Disabled', disabled: true }
        },
        {
            name: 'Readonly',
            inputs: { variant: 'filled', label: 'Readonly', readonly: true }
        },
        {
            name: 'On dark',
            inputs: { variant: 'elevated', label: 'On dark' },
            bg: 'dark'
        },
        {
            name: 'Full width',
            inputs: { variant: 'filled', label: 'Full width', fullWidth: true },
            canvasLayout: 'stretch'
        },
        {
            name: 'Hovered',
            inputs: { variant: 'filled', label: 'Hovered' },
            bg: 'light',
            pseudo: { hover: '.btn' }
        },
        {
            name: 'Pressed',
            inputs: { variant: 'filled', label: 'Pressed' },
            bg: 'light',
            pseudo: { hover: '.btn', active: '.btn' }
        },
        {
            name: 'Focus visible',
            inputs: { variant: 'outlined', label: 'Focus visible' },
            bg: 'light',
            // The ring is an outline with an offset, drawn outside the button's box.
            pseudo: { 'focus-visible': '.btn' }
        }
    ],
    tags: ['form', 'action', 'button']
})
@Component({
    selector: 'lib-button',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '[class.btn-host--full-width]': 'fullWidth()'
    },
    template: `
        <button class="btn" [class]="'btn--' + variant()" [disabled]="disabled() || null" (click)="clicked.emit()">
            @if (variant() === 'icon-only') {
                <span class="btn__icon" aria-hidden="true">{{ icon() }}</span>
            } @else {
                {{ label() }}
            }
        </button>
    `,
    styles: `
        :host {
            display: inline-block;
        }

        :host(.btn-host--full-width) {
            display: block;
            width: 100%;
        }

        :host(.btn-host--full-width) .btn {
            display: flex;
            width: 100%;
        }

        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            font-family:
                system-ui,
                -apple-system,
                sans-serif;
            font-size: 14px;
            font-weight: 500;
            line-height: 1;
            border-radius: 8px;
            cursor: pointer;
            border: none;
            outline: none;
            transition:
                background 120ms ease,
                box-shadow 120ms ease,
                color 120ms ease;
            white-space: nowrap;
        }

        .btn:focus-visible {
            outline: 2px solid #6366f1;
            outline-offset: 2px;
        }

        .btn:disabled {
            cursor: not-allowed;
            opacity: 0.45;
            pointer-events: none;
        }

        /* filled */
        .btn--filled {
            padding: 10px 20px;
            background: #6366f1;
            color: #fff;
        }
        .btn--filled:hover:not(:disabled) {
            background: #4f46e5;
        }
        .btn--filled:active:not(:disabled) {
            background: #4338ca;
        }

        /* outlined */
        .btn--outlined {
            padding: 9px 19px;
            background: transparent;
            color: #6366f1;
            border: 1px solid #6366f1;
        }
        .btn--outlined:hover:not(:disabled) {
            background: #eef2ff;
        }
        .btn--outlined:active:not(:disabled) {
            background: #e0e7ff;
        }

        /* elevated */
        .btn--elevated {
            padding: 10px 20px;
            background: #fff;
            color: #6366f1;
            box-shadow:
                0 1px 3px rgba(0, 0, 0, 0.12),
                0 1px 2px rgba(0, 0, 0, 0.08);
        }
        .btn--elevated:hover:not(:disabled) {
            box-shadow:
                0 4px 8px rgba(0, 0, 0, 0.14),
                0 2px 4px rgba(0, 0, 0, 0.08);
            background: #f8f8ff;
        }
        .btn--elevated:active:not(:disabled) {
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        /* text */
        .btn--text {
            padding: 10px 12px;
            background: transparent;
            color: #6366f1;
        }
        .btn--text:hover:not(:disabled) {
            background: #eef2ff;
        }
        .btn--text:active:not(:disabled) {
            background: #e0e7ff;
        }

        /* icon-only */
        .btn--icon-only {
            width: 40px;
            height: 40px;
            padding: 0;
            border-radius: 50%;
            background: #6366f1;
            color: #fff;
            font-size: 16px;
        }
        .btn--icon-only:hover:not(:disabled) {
            background: #4f46e5;
        }
        .btn--icon-only:active:not(:disabled) {
            background: #4338ca;
        }

        .btn__icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            line-height: 1;
        }
    `
})
export class ButtonComponent {
    /**
     * Visual style **variant** of the button.
     * Use `icon-only` to render `icon` instead of `label`.
     */
    readonly variant = input<ButtonVariantType>('filled');

    /** Label text displayed inside the button. Not rendered in `icon-only` variant. */
    readonly label = input<string>('Button');

    /**
     * Icon character displayed in `icon-only` variant.
     * Any Unicode character or symbol can be used.
     */
    readonly icon = input<string>('★');

    /** Disables the button: prevents interaction and reduces opacity. */
    readonly disabled = input<boolean>(false);

    /** Stretches the button to fill the container width. */
    readonly fullWidth = input<boolean>(false);

    /**
     * Puts the button into a *readonly* visual state without disabling it at the DOM level.
     * @since 1.1.0
     */
    readonly readonly = input<boolean>(false);

    /** Emits when the button is clicked. Not emitted when `disabled`. */
    readonly clicked = output<void>();
}
