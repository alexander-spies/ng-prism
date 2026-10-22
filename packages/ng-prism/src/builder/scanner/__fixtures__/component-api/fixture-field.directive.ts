import { Directive, model } from '@angular/core';
import { Showcase } from './showcase.js';

@Directive()
export abstract class FixtureField<T> {
    readonly value = model<T>();

    /** Clears the value. */
    clear(): void {}
}

@Showcase({ title: 'Number Field' })
@Directive({ selector: '[fxNumberField]' })
export class FixtureNumberFieldDirective extends FixtureField<number> {}
