import { ChangeDetectionStrategy, Component, input, signal, ViewEncapsulation } from '@angular/core';
import { Showcase } from '@ng-prism/core';

/** Side of the trigger a tooltip appears on. */
export type TooltipPositionType = 'top' | 'bottom' | 'left' | 'right';

/**
 * Inline help text with a tooltip that appears while the pointer is over it.
 *
 * The component brings its own trigger, the text in `triggerLabel`. To put a tooltip on an element
 * you already have, such as a button, use `TooltipDirective` instead.
 *
 * ## Positions
 *
 * `top` (default), `bottom`, `left` and `right`, each with an arrow that points at the trigger.
 *
 * @since 1.0.0
 * @see TooltipDirective
 * @example
 * ```html
 * <sg-tooltip triggerLabel="What is this?" text="Shown on every invoice." position="right" />
 * ```
 */
@Showcase({
    title: 'Tooltip',
    status: 'wip',
    category: 'Overlay',
    description: 'Hover-triggered tooltip with configurable position and text.',
    variants: [
        { name: 'Top', inputs: { text: 'Helpful hint', position: 'top', triggerLabel: 'Hover me' } },
        { name: 'Bottom', inputs: { text: 'More info below', position: 'bottom', triggerLabel: 'Hover me' } },
        { name: 'Left', inputs: { text: 'Side note', position: 'left', triggerLabel: 'Hover me' } },
        { name: 'Right', inputs: { text: 'Extra context', position: 'right', triggerLabel: 'Hover me' } },
        {
            name: 'Long Text',
            inputs: { text: 'This is a longer tooltip message that wraps to multiple lines for detailed explanations.', position: 'top', triggerLabel: 'Details' }
        }
    ],
    tags: ['overlay', 'tooltip', 'hint', 'popover']
})
@Component({
    selector: 'sg-tooltip',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: {
        class: 'sg-tooltip',
        '(mouseenter)': 'show()',
        '(mouseleave)': 'hide()',
        '(focus)': 'show()',
        '(blur)': 'hide()'
    },
    template: `
        <span class="sg-tooltip__trigger" tabindex="0">{{ triggerLabel() }}</span>
        @if (visible()) {
            <div class="sg-tooltip__popup" [attr.data-position]="position()" role="tooltip">
                {{ text() }}
                <div class="sg-tooltip__arrow"></div>
            </div>
        }
    `,
    styles: `
        .sg-tooltip {
            position: relative;
            display: inline-flex;
        }
        .sg-tooltip__trigger {
            cursor: help;
            border-bottom: 1px dashed #9ca3af;
            color: #374151;
            font-size: 14px;
        }
        .sg-tooltip__popup {
            position: absolute;
            z-index: 10;
            padding: 6px 10px;
            background: #1f2937;
            color: #fff;
            font-size: 12px;
            line-height: 1.4;
            border-radius: 6px;
            white-space: normal;
            max-width: 220px;
            pointer-events: none;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .sg-tooltip__popup[data-position='top'] {
            bottom: calc(100% + 8px);
            left: 50%;
            transform: translateX(-50%);
        }
        .sg-tooltip__popup[data-position='bottom'] {
            top: calc(100% + 8px);
            left: 50%;
            transform: translateX(-50%);
        }
        .sg-tooltip__popup[data-position='left'] {
            right: calc(100% + 8px);
            top: 50%;
            transform: translateY(-50%);
        }
        .sg-tooltip__popup[data-position='right'] {
            left: calc(100% + 8px);
            top: 50%;
            transform: translateY(-50%);
        }
        .sg-tooltip__arrow {
            position: absolute;
            width: 8px;
            height: 8px;
            background: #1f2937;
            transform: rotate(45deg);
        }
        .sg-tooltip__popup[data-position='top'] .sg-tooltip__arrow {
            bottom: -4px;
            left: 50%;
            margin-left: -4px;
        }
        .sg-tooltip__popup[data-position='bottom'] .sg-tooltip__arrow {
            top: -4px;
            left: 50%;
            margin-left: -4px;
        }
        .sg-tooltip__popup[data-position='left'] .sg-tooltip__arrow {
            right: -4px;
            top: 50%;
            margin-top: -4px;
        }
        .sg-tooltip__popup[data-position='right'] .sg-tooltip__arrow {
            left: -4px;
            top: 50%;
            margin-top: -4px;
        }
    `
})
export class TooltipComponent {
    /** Side of the trigger the tooltip appears on, see {@link TooltipPositionType}. */
    readonly position = input<TooltipPositionType>('top');

    /** Text of the tooltip. */
    readonly text = input.required<string>();

    /** Text of the trigger the tooltip belongs to. */
    readonly triggerLabel = input<string>('');
    protected readonly visible = signal(false);

    /** Shows the tooltip without a hover, e.g. to point out a feature once. */
    show(): void {
        this.visible.set(true);
    }

    /** Hides the tooltip again. */
    hide(): void {
        this.visible.set(false);
    }
}
