import { Component, Injectable, input, output } from '@angular/core';

function Showcase(config: unknown): ClassDecorator {
    return () => {};
}

@Showcase({ title: 'Select', variants: [{ name: 'Default' }] })
@Component({ selector: 'lib-select, [libSelect]', standalone: true, template: '<ng-content />' })
export class SelectComponent {}

@Showcase({ title: 'Option', category: 'Forms', partOf: 'lib-select', variants: [{ name: 'Default' }] })
@Component({ selector: 'lib-option', standalone: true, template: '<ng-content />' })
export class OptionComponent {
    readonly value = input.required<string>();
    readonly disabled = input(false);
    readonly remove = output<void>();
}

@Showcase({ title: 'Optgroup', partOf: ' [libSelect] ' })
@Component({ selector: 'lib-optgroup', standalone: true, template: '<ng-content />' })
export class OptgroupComponent {}

@Showcase({ title: 'Orphan', partOf: 'lib-missing', variants: [{ name: 'A' }, { name: 'B' }] })
@Component({ selector: 'lib-orphan', standalone: true, template: '' })
export class OrphanComponent {}

@Showcase({ title: 'Twin A' })
@Component({ selector: 'lib-twin', standalone: true, template: '' })
export class TwinAComponent {}

@Showcase({ title: 'Twin B' })
@Component({ selector: 'lib-twin', standalone: true, template: '' })
export class TwinBComponent {}

@Showcase({ title: 'Twin part', partOf: 'lib-twin' })
@Component({ selector: 'lib-twin-part', standalone: true, template: '' })
export class TwinPartComponent {}

@Showcase({ title: 'Chain', partOf: 'lib-option' })
@Component({ selector: 'lib-chain', standalone: true, template: '' })
export class ChainComponent {}

@Showcase({ title: 'Self', partOf: 'lib-self' })
@Component({ selector: 'lib-self', standalone: true, template: '' })
export class SelfComponent {}

@Showcase({ title: 'Number partOf', partOf: 42 })
@Component({ selector: 'lib-number-part-of', standalone: true, template: '' })
export class NumberPartOfComponent {}

@Showcase({ title: 'Svc', partOf: 'lib-select' })
@Injectable({ providedIn: 'root' })
export class PartServiceStub {}
