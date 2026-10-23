import { Component } from '@angular/core';

function Showcase(config: unknown): ClassDecorator {
    return () => {};
}

// The fixture library, plus a class Angular cannot parse the selector of, and no showcase that composes.
export * from './public-api.js';

@Showcase({ title: 'Odd', variants: [{ name: 'Default' }] })
@Component({
    selector: 'lib-odd:not(.a:not(.b))',
    standalone: true,
    template: ''
})
export class OddComponent {}
