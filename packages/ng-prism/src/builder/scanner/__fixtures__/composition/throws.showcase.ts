import { Component } from '@angular/core';

function Showcase(config: unknown): ClassDecorator {
    return () => {};
}

// The fixture library, plus this OddComponent.
export * from './public-api.js';

// Angular's CssSelector.parse throws on a nested :not, which is how the compiler fails here.
@Showcase({
    title: 'Odd',
    host: { template: '<section><lib-odd /></section>' },
    variants: [{ name: 'Default' }]
})
@Component({
    selector: 'lib-odd:not(.a:not(.b))',
    standalone: true,
    template: ''
})
export class OddComponent {}

// Read against the same library, which has OddComponent in it.
@Showcase({
    title: 'Calm',
    variants: [{ name: 'Default', template: '<lib-icon />' }]
})
@Component({
    selector: 'lib-calm',
    standalone: true,
    template: '<ng-content />'
})
export class CalmComponent {}
