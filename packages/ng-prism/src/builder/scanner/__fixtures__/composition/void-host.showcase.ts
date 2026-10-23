import { Directive } from '@angular/core';

function Showcase(config: unknown): ClassDecorator {
    return () => {};
}

// The fixture library, plus these two directives.
export * from './public-api.js';

@Showcase({
    title: 'Mask',
    host: '<input type="text">',
    variants: [{ name: 'Masked', template: '<b>x</b>' }]
})
@Directive({
    selector: '[libMask]',
    standalone: true
})
export class MaskDirective {}

@Showcase({
    title: 'Broken host',
    host: '<div><span>',
    variants: [{ name: 'Default', template: 'Text' }]
})
@Directive({
    selector: '[libBrokenHost]',
    standalone: true
})
export class BrokenHostDirective {}
