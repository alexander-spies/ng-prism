import { Component, input } from '@angular/core';

function Showcase(config: unknown): ClassDecorator {
    return () => {};
}

// The fixture library, with this FormFieldComponent in place of the one it exports.
export * from './public-api.js';

@Showcase({
    title: 'Form field',
    variants: [
        { name: 'Default', template: '<input libInput />' },
        { name: 'Broken', template: '<span></div>' },
        { name: 'Typo', template: '<lib-icn name="search" />' },
        { name: 'Bad pipe', template: '{{ "a" | nope }}' },
        { name: 'Twins', template: '<lib-twin />' },
        { name: 'No subject', host: { template: '<section></section>' } },
        { name: 'HTML content', content: '<b>Hi</b>', host: { template: '<section><lib-form-field /></section>' } },
        { name: 'Plain', content: '<b>Hi</b>' }
    ]
})
@Component({
    selector: 'lib-form-field',
    standalone: true,
    template: '<ng-content />'
})
export class FormFieldComponent {
    readonly label = input('');
}
