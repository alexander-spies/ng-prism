import { Directive } from '@angular/core';

function Showcase(config: unknown): ClassDecorator {
    return () => {};
}

// The fixture library, with this EmailDirective in place of the one it exports.
export * from './public-api.js';

// Its selector names only standard attributes, so its own element is a match the written-name rule leaves out.
@Showcase({
    title: 'Email',
    host: { template: '<lib-form-field><input type="email" /></lib-form-field>' },
    variants: [{ name: 'Default' }]
})
@Directive({
    selector: 'input[type=email]',
    standalone: true
})
export class EmailDirective {}
