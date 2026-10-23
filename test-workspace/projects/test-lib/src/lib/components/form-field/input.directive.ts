import { booleanAttribute, Directive, inject, input } from '@angular/core';
import { Showcase } from '@ng-prism/core';
import { LIB_FORM_FIELD, LIB_FORM_FIELD_CONTROL, type LibFormFieldControl } from './form-field.tokens.js';

let nextId = 0;

/**
 * Makes a native `<input>` or `<textarea>` the control of the `lib-form-field` around it.
 *
 * The directive gives its element an id and the class `lib-input`, whose styles come with the field. It reports
 * `required` and `disabled` to the field and sets them, like `readonly`, on the element. Inside a field it takes the
 * field's label as its accessible name (`aria-labelledby`) and the hint as its description (`aria-describedby`).
 *
 * @since 1.6.0
 * @see FormFieldComponent
 * @example
 * ```html
 * <lib-form-field label="Name">
 *   <input libInput required />
 * </lib-form-field>
 * ```
 */
@Showcase<InputDirective>({
    title: 'Input',
    category: 'Forms',
    description: 'Directive on a native input inside `lib-form-field`, shown in its frame through a host template.',
    host: { template: '<lib-form-field label="Name"><input libInput type="text" /></lib-form-field>' },
    bg: 'light',
    variants: [
        { name: 'Default' },
        { name: 'Required', inputs: { required: true } },
        { name: 'With hint', host: { template: '<lib-form-field label="Name" hint="As on your ID"><input libInput /></lib-form-field>' } }
    ],
    tags: ['form', 'input', 'directive']
})
@Directive({
    selector: 'input[libInput], textarea[libInput]',
    standalone: true,
    providers: [{ provide: LIB_FORM_FIELD_CONTROL, useExisting: InputDirective }],
    host: {
        class: 'lib-input',
        '[id]': 'id',
        '[required]': 'required()',
        '[disabled]': 'disabled()',
        '[readOnly]': 'readonly()',
        '[attr.aria-labelledby]': 'field?.labelId() ?? null',
        '[attr.aria-describedby]': 'field?.hintId() ?? null'
    }
})
export class InputDirective implements LibFormFieldControl {
    /** Requires a value: the field marks its label. */
    readonly required = input(false, { transform: booleanAttribute });

    /** Disables the element and dims the field. */
    readonly disabled = input(false, { transform: booleanAttribute });

    /** Shows the value without letting it be changed. */
    readonly readonly = input(false, { transform: booleanAttribute });

    /** Id of the element, which the field's label points at. */
    readonly id = `lib-input-${nextId++}`;

    protected readonly field = inject(LIB_FORM_FIELD, { optional: true });
}
