import { Component } from '@angular/core';

function Showcase(config: unknown): ClassDecorator {
    return () => {};
}

@Showcase({ title: 'Form field' })
@Component({
    selector: 'lib-form-field',
    standalone: true,
    template: '<ng-content />'
})
export class FormFieldComponent {}
