import { Component, input } from '@angular/core';

function Showcase(config: unknown): ClassDecorator {
    return () => {};
}

// The fixture library, with this FormFieldComponent in place of the one it exports: a local export wins over `export *`.
export * from './public-api.js';

@Showcase({
    title: 'Form field',
    variants: [
        { name: 'Default', inputs: { label: 'E-Mail' }, template: '<input libInput type="email" />' },
        { name: 'With icon', inputs: { label: 'Search' }, template: '<lib-icon libPrefix /><input libInput />' },
        { name: 'Note', inputs: { label: 'Note' }, template: '<textarea libInput></textarea>' },
        { name: 'Again', inputs: { label: 'Again' }, template: '<input libInput type="email" />' }
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
