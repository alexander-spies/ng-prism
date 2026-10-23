import { Directive } from '@angular/core';

function Showcase(config: unknown): ClassDecorator {
    return () => {};
}

// The fixture library, with this InputDirective in place of the one it exports.
export * from './public-api.js';

// No variants: the styleguide renders the showcase as one, which the host template applies to.
@Showcase({
    title: 'Input',
    host: { template: '<lib-form-field><input libInput /></lib-form-field>' }
})
@Directive({
    selector: 'input[libInput], textarea[libInput]',
    standalone: true
})
export class InputDirective {}
