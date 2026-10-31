import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Showcase } from '@ng-prism/core';

@Showcase({
    title: 'Card',
    status: 'stable',
    category: 'Layout',
    description: 'Card living in the @test-ui-kit/card secondary entry point.',
    variants: [
        {
            name: 'Basic',
            inputs: {
                title: 'Hello world',
                body: 'This card lives in its own secondary entry point.'
            }
        },
        {
            name: 'No body',
            inputs: { title: 'Title only' }
        }
    ]
})
@Component({
    selector: 'uk-card',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <article class="uk-card">
            <h3 class="uk-card__title">{{ title() }}</h3>
            @if (body()) {
                <p class="uk-card__body">{{ body() }}</p>
            }
        </article>
    `,
    styles: `
        :host {
            display: block;
            max-width: 320px;
        }
        .uk-card {
            background: #fff;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
            font-family: system-ui, sans-serif;
        }
        .uk-card__title {
            margin: 0 0 8px;
            font-size: 16px;
            font-weight: 600;
            color: #111827;
        }
        .uk-card__body {
            margin: 0;
            font-size: 14px;
            color: #4b5563;
            line-height: 1.5;
        }
    `
})
export class CardComponent {
    readonly body = input<string>('');
    readonly title = input<string>('Card');
}
