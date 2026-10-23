import { Component } from '@angular/core';

function Showcase(config: unknown): ClassDecorator {
    return () => {};
}

// The fixture library, with this FormFieldComponent in place of the one it exports.
export * from './public-api.js';

@Showcase({
    title: 'Form field',
    imports: [{ name: 'X', from: 'nope' }],
    variants: [
        { name: 'Custom', template: '<x-thing />' },
        { name: 'Piped', template: '{{ "a" | shout }}' }
    ]
})
@Component({
    selector: 'lib-form-field',
    standalone: true,
    template: '<ng-content />'
})
export class FormFieldComponent {}
