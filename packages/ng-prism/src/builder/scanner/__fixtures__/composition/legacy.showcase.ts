import { Component, Directive, input } from '@angular/core';

function Showcase(config: unknown): ClassDecorator {
    return () => {};
}

// The fixture library, with this FormFieldComponent in place of the one it exports.
export * from './public-api.js';

/** Declared in an NgModule of the library, which a template that uses it has to import. */
@Component({
    selector: 'lib-legacy-badge',
    standalone: false,
    template: ''
})
export class LegacyBadgeComponent {}

@Directive({
    selector: '[libLegacyMask]',
    standalone: false
})
export class LegacyMaskDirective {}

@Showcase({
    title: 'Form field',
    variants: [
        { name: 'Badge', template: '<lib-legacy-badge />' },
        { name: 'Masked', template: '<input libInput libLegacyMask />' }
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
