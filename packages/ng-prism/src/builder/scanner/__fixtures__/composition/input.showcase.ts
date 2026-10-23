import { Directive, input } from '@angular/core';

function Showcase(config: unknown): ClassDecorator {
    return () => {};
}

// The fixture library, with this InputDirective in place of the one it exports.
export * from './public-api.js';

@Showcase({
    title: 'Input',
    host: { template: '<lib-form-field><input libInput type="text" /></lib-form-field>' },
    variants: [{ name: 'Default' }, { name: 'Disabled', inputs: { disabled: true } }]
})
@Directive({
    selector: 'input[libInput], textarea[libInput]',
    standalone: true
})
export class InputDirective {
    readonly disabled = input(false);
}
