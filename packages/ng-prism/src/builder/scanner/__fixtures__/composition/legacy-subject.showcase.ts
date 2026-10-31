import { Component } from '@angular/core';

function Showcase(config: unknown): ClassDecorator {
    return () => {};
}

export * from './public-api.js';

/** The generated wrapper is standalone, and can only import a subject that is standalone as well. */
@Showcase({
    title: 'Legacy card',
    variants: [{ name: 'Plain' }, { name: 'With icon', template: '<lib-icon />' }]
})
@Component({
    selector: 'lib-legacy-card',
    standalone: false,
    template: '<ng-content />'
})
export class LegacyCardComponent {}
