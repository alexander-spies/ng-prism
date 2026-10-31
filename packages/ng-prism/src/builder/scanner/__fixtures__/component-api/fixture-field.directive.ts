import { Directive, input, model } from '@angular/core';
import { Showcase } from './showcase.js';
import type { FixtureVariant } from './tab.model.js';

@Directive()
export abstract class FixtureField<T> {
    readonly value = model<T>();
    readonly variant = input<FixtureVariant>();

    /** Clears the value. */
    clear(): void {}
}

@Showcase({ title: 'Number Field' })
@Directive({ selector: '[fxNumberField]' })
export class FixtureNumberFieldDirective extends FixtureField<number> {}
