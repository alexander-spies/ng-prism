import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Showcase } from '@ng-prism/core';

export type ButtonVariantType = 'primary' | 'secondary' | 'ghost';

@Showcase<ButtonComponent>({
    title: 'Button',
    status: 'stable',
    category: 'Inputs',
    description: 'Button living in the @test-ui-kit/button secondary entry point.',
    variants: [
        {
            name: 'Primary',
            inputs: { variant: 'primary', label: 'Primary' }
        },
        {
            name: 'Secondary',
            inputs: { variant: 'secondary', label: 'Secondary' }
        },
        {
            name: 'Ghost',
            inputs: { variant: 'ghost', label: 'Ghost' }
        }
    ]
})
@Component({
    selector: 'uk-button',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <button class="uk-btn" [class]="'uk-btn--' + variant()" (click)="clicked.emit()">
            {{ label() }}
        </button>
    `,
    styles: `
        :host {
            display: inline-block;
        }
        .uk-btn {
            font-family: system-ui, sans-serif;
            font-size: 14px;
            font-weight: 500;
            padding: 10px 18px;
            border-radius: 8px;
            border: 1px solid transparent;
            cursor: pointer;
            transition:
                background 120ms ease,
                color 120ms ease,
                border-color 120ms ease;
        }
        .uk-btn--primary {
            background: #6366f1;
            color: #fff;
        }
        .uk-btn--primary:hover {
            background: #4f46e5;
        }
        .uk-btn--secondary {
            background: #fff;
            color: #6366f1;
            border-color: #6366f1;
        }
        .uk-btn--secondary:hover {
            background: #eef2ff;
        }
        .uk-btn--ghost {
            background: transparent;
            color: #6366f1;
        }
        .uk-btn--ghost:hover {
            background: #eef2ff;
        }
    `
})
export class ButtonComponent {
    readonly label = input<string>('Button');
    readonly variant = input<ButtonVariantType>('primary');
    readonly clicked = output<void>();
}
