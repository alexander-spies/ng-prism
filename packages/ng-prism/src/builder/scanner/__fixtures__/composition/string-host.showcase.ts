import { Directive } from '@angular/core';

function Showcase(config: unknown): ClassDecorator {
    return () => {};
}

// The fixture library, plus this TooltipDirective.
export * from './public-api.js';

// A variant template is the content of the string host, which keeps rendering the variants without one.
@Showcase({
    title: 'Tooltip',
    host: '<button class="btn">Hover me</button>',
    variants: [{ name: 'Default' }, { name: 'Rich', template: '<lib-icon /> Save' }]
})
@Directive({
    selector: '[libTooltip]',
    standalone: true
})
export class TooltipDirective {}
