import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The ghost icon button of header, component head, toolbars and the tool rail.
 *
 * md 32 px (header), sm 28 px (component head), xs 26 px (toolbars, rail).
 * `pressed` makes it a toggle (`aria-pressed`) with the active tint. Colours run
 * through `--prism-icon-button-*`, so a surface such as the tool rail can bend
 * them to its own tokens.
 */
@Component({
    selector: 'button[prismIconButton]',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './prism-icon-button.component.html',
    styleUrl: './prism-icon-button.component.css',
    host: {
        type: 'button',
        '[class]': "'prism-icon-button prism-icon-button--' + size()",
        '[class.prism-icon-button--pressed]': 'pressed() === true',
        '[attr.aria-pressed]': 'pressed()'
    }
})
export class PrismIconButtonComponent {
    readonly size = input<'md' | 'sm' | 'xs'>('md');
    /** `null` for a plain button, a boolean for a toggle. */
    readonly pressed = input<boolean | null>(null);
}
