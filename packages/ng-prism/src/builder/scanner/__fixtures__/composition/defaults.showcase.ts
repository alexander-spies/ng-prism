import { Directive, input } from '@angular/core';

function Showcase(config: unknown): ClassDecorator {
    return () => {};
}

function defaultSize(): string {
    return 'm';
}

// The fixture library, with this InputDirective in place of the one it exports.
export * from './public-api.js';

@Showcase({
    title: 'Input',
    host: { template: '<lib-form-field><input libInput /></lib-form-field>' },
    variants: [{ name: 'Default' }, { name: 'Large', inputs: { size: 'l' } }]
})
@Directive({
    selector: 'input[libInput], textarea[libInput]',
    standalone: true
})
export class InputDirective {
    readonly size = input(defaultSize());
}
