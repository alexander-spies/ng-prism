import { ChangeDetectionStrategy, Component, contentChildren, input, model, ViewEncapsulation } from '@angular/core';
import { Showcase } from '@ng-prism/core';
import { RadioComponent } from './radio.component.js';
import { LIB_RADIO_GROUP, type LibRadioGroup } from './radio.tokens.js';

/** How far an arrow key moves the selection through the radios. */
const ARROW_STEPS: ReadonlyMap<string, number> = new Map([
    ['ArrowDown', 1],
    ['ArrowRight', 1],
    ['ArrowUp', -1],
    ['ArrowLeft', -1]
]);

/**
 * A group of `lib-radio` options, one of which can be selected.
 *
 * The group gives its radios a shared name and holds the selected value. The arrow keys move the focus to the next or
 * previous radio, wrapping around at the ends, and select it, as in a native radio group.
 *
 * `value` is a model: bind it with `[(value)]`, or listen to `valueChange`.
 *
 * @since 1.6.0
 * @see RadioComponent
 * @example
 * ```html
 * <lib-radio-group name="size" [(value)]="size">
 *   <lib-radio value="s">Small</lib-radio>
 *   <lib-radio value="m">Medium</lib-radio>
 *   <lib-radio value="l">Large</lib-radio>
 * </lib-radio-group>
 * ```
 */
@Showcase<RadioGroupComponent>({
    title: 'Radio Group',
    category: 'Forms',
    description: 'Group of `lib-radio` children that it finds as content, with arrow-key navigation.',
    bg: 'light',
    variants: [
        {
            name: 'Default',
            inputs: { name: 'size' },
            template: '<lib-radio value="s">Small</lib-radio><lib-radio value="m">Medium</lib-radio><lib-radio value="l">Large</lib-radio>'
        },
        {
            name: 'Preselected',
            inputs: { name: 'delivery', value: 'express' },
            template: '<lib-radio value="standard">Standard</lib-radio><lib-radio value="express">Express</lib-radio><lib-radio value="overnight">Overnight</lib-radio>'
        }
    ],
    tags: ['form', 'radio', 'choice']
})
@Component({
    selector: 'lib-radio-group',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    providers: [{ provide: LIB_RADIO_GROUP, useExisting: RadioGroupComponent }],
    host: {
        class: 'lib-radio-group',
        role: 'radiogroup',
        '(keydown)': 'onKeydown($event)'
    },
    template: `<ng-content />`,
    styles: `
        .lib-radio-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
    `
})
export class RadioGroupComponent implements LibRadioGroup {
    /** Name the radios of the group share, as on native radios. */
    readonly name = input<string>('');

    /** Value of the selected radio, empty while none is selected. Two-way bindable with `[(value)]`. */
    readonly value = model<string>('');

    private readonly radios = contentChildren(RadioComponent, { descendants: true });

    /** Selects the radio with this value. */
    select(value: string): void {
        this.value.set(value);
    }

    protected onKeydown(event: KeyboardEvent): void {
        const step = ARROW_STEPS.get(event.key);
        const radios = this.radios();
        const current = radios.findIndex((radio) => radio.hasFocus());

        if (step === undefined || current === -1) return;
        event.preventDefault();

        const next = radios[(current + step + radios.length) % radios.length];

        next.focus();
        this.select(next.value());
    }
}
