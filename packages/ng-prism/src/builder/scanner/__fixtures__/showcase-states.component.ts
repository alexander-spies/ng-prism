import { Component } from '@angular/core';

function Showcase(config: unknown): ClassDecorator {
    return () => {};
}

function pickTarget(): string {
    return '.btn';
}

@Showcase({
    title: 'Showcase States',
    states: [
        { name: 'Hover', pseudo: { hover: '.btn' } },
        { name: 'Pressed', pseudo: { hover: '.btn', active: '.btn' } },
        'oops',
        { pseudo: { focus: '.btn' } },
        { name: 'Hover', pseudo: { focus: '.btn' } },
        { name: 'Empty' },
        { name: 'Bad', pseudo: { checked: true } }
    ],
    variants: [{ name: 'Plain' }, { name: 'Opted out', states: false }, { name: 'Wrong', states: true }]
})
@Component({ selector: 'showcase-states', standalone: true, template: '' })
export class ShowcaseStatesComponent {}

@Showcase({
    title: 'Page States',
    renderPage: 'Some Page',
    states: [{ name: 'Hover', pseudo: { hover: '.btn' } }]
})
@Component({ selector: 'page-states', standalone: true, template: '' })
export class PageStatesComponent {}

@Showcase({
    title: 'Unevaluable State',
    states: [
        { name: 'Plain', pseudo: { hover: '.btn' } },
        { name: 'Pressed', pseudo: { hover: pickTarget() } }
    ]
})
@Component({ selector: 'unevaluable-state', standalone: true, template: '' })
export class UnevaluableStateComponent {}

function makeState(): Record<string, unknown> {
    return { name: 'Made', pseudo: { hover: '.btn' } };
}

@Showcase({
    title: 'Gap States',
    states: [{ name: 'A', pseudo: { hover: '.a' } }, makeState(), { name: 'C', pseudo: { hover: '.c' } }]
})
@Component({ selector: 'gap-states', standalone: true, template: '' })
export class GapStatesComponent {}
