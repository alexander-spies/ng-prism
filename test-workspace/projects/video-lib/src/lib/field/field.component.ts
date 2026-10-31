import { Component, input, ViewEncapsulation } from '@angular/core';
import { Showcase } from '@ng-prism/core';

@Showcase({
    title: 'Field',
    category: 'Inputs',
    variants: [
        {
            name: 'E-Mail',
            inputs: { label: 'E-Mail' },
            template: '<input uiInput placeholder="you@example.com" />'
        }
    ]
})
@Component({
    selector: 'ui-field',
    templateUrl: './field.component.html',
    styleUrl: './field.component.css',
    encapsulation: ViewEncapsulation.None
})
export class FieldComponent {
    readonly error = input('');
    readonly label = input('Label');
}
