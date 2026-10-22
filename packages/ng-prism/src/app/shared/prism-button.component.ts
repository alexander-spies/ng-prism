import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Text buttons for toolbar actions. `primary` fills with the brand blue,
 * `secondary` draws a contour, `ghost` neither. Secondary goes before primary.
 */
@Component({
    selector: 'button[prismButton]',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './prism-button.component.html',
    styleUrl: './prism-button.component.css',
    host: {
        type: 'button',
        '[class]': "'prism-button prism-button--' + variant() + ' prism-button--' + size()"
    }
})
export class PrismButtonComponent {
    readonly variant = input<'secondary' | 'primary' | 'ghost'>('secondary');
    readonly size = input<'sm' | 'md'>('sm');
}
