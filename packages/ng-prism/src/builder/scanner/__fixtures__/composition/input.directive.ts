import { Directive } from '@angular/core';

function Showcase(config: unknown): ClassDecorator {
    return () => {};
}

@Showcase({ title: 'Input' })
@Directive({
    selector: 'input[libInput], textarea[libInput]',
    standalone: true
})
export class InputDirective {}
