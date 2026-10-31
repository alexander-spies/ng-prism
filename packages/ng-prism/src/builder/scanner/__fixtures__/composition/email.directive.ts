import { Directive } from '@angular/core';

@Directive({
    selector: 'input[type=email]',
    standalone: true
})
export class EmailDirective {}
