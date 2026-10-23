import { Directive } from '@angular/core';

function Showcase(config: unknown): ClassDecorator {
    return () => {};
}

// The fixture library, plus this HintDirective.
export * from './public-api.js';

@Showcase({
    title: 'Hint',
    host: { template: '<p><span libHint>Old</span></p>' },
    variants: [
        { name: 'Escaped', content: 'a < {b}' },
        { name: 'Entities', content: 'Tom & Jerry @if' }
    ]
})
@Directive({
    selector: '[libHint]',
    standalone: true
})
export class HintDirective {}
