import { Component } from '@angular/core';

export interface ShowcaseConfig {
    title: string;
    variants?: { name: string; pseudo?: unknown }[];
}

function Showcase(config: ShowcaseConfig): ClassDecorator {
    return () => {};
}

const FOCUS_TARGET = '.btn';

@Showcase({
    title: 'Pseudo States',
    variants: [
        { name: 'Plain' },
        { name: 'Focused', pseudo: { 'focus-visible': FOCUS_TARGET } },
        { name: 'Hovered', pseudo: { hover: true } },
        { name: 'Pressed', pseudo: { active: ['.btn', '.btn__icon'], focus: '.btn' } },
        { name: 'Unknown state', pseudo: { hover: true, checked: true } },
        { name: 'Wrong targets', pseudo: { focus: 42, hover: false } },
        { name: 'Mixed list', pseudo: { 'focus-within': ['.field', 7, ''] } },
        { name: 'Empty', pseudo: { focus: '  ', active: [] } },
        { name: 'Not an object', pseudo: 'hover' }
    ]
})
@Component({ selector: 'pseudo-states', standalone: true, template: '' })
export class PseudoStatesComponent {}
