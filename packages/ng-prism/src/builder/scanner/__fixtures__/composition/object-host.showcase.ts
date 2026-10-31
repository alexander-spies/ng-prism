import { Directive } from '@angular/core';

function Showcase(config: unknown): ClassDecorator {
    return () => {};
}

// The fixture library, plus these two directives.
export * from './public-api.js';

// The host comes from a package ng-prism cannot read.
@Showcase({
    title: 'Prefix',
    host: { selector: 'x-frame', import: { name: 'XFrame', from: 'x-frame' }, inputs: { label: 'Say "hi" & go', size: 2 } },
    variants: [{ name: 'Default', template: '<lib-icon />' }]
})
@Directive({
    selector: '[libPrefix]',
    standalone: true
})
export class PrefixDirective {}

// The host is a class of the library.
@Showcase({
    title: 'Suffix',
    host: { selector: 'lib-form-field', import: { name: 'FormFieldComponent', from: 'fixture-lib' } },
    variants: [{ name: 'Default', template: '<lib-icn />' }]
})
@Directive({
    selector: '[libSuffix]',
    standalone: true
})
export class SuffixDirective {}
