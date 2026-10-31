import { Directive, input } from '@angular/core';

function Showcase(config: unknown): ClassDecorator {
    return () => {};
}

// The fixture library, with this InputDirective in place of the one it exports.
export * from './public-api.js';

@Showcase({
    title: 'Input',
    host: { template: '<lib-form-field><input libInput required /></lib-form-field>' },
    variants: [{ name: 'Default', inputs: { label: 'Name', required: false } }]
})
@Directive({
    selector: 'input[libInput], textarea[libInput]',
    standalone: true
})
export class InputDirective {
    readonly label = input('');
    readonly required = input(false);
}
