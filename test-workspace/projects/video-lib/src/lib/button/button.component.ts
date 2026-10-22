import { Component, input, output } from '@angular/core';
import { Showcase } from '@ng-prism/core';

@Showcase({
    title: 'Button',
    category: 'Inputs',
    variants: [
        { name: 'Primary', inputs: { label: 'Save' } },
        { name: 'Ghost', inputs: { label: 'Save', variant: 'ghost' } }
    ],
    states: [
        { name: 'Hover', pseudo: { hover: '.btn' } },
        { name: 'Focus visible', pseudo: { 'focus-visible': '.btn' } },
        { name: 'Pressed', pseudo: { hover: '.btn', active: '.btn' } }
    ]
})
@Component({
    selector: 'ui-button',
    styleUrl: './button.component.css',
    template: `<button class="btn" [class.btn--ghost]="variant() === 'ghost'" (click)="clicked.emit()">{{ label() }}</button>`
})
export class ButtonComponent {
    readonly label = input('Button');
    readonly variant = input<'primary' | 'ghost'>('primary');
    readonly clicked = output<void>();
}
