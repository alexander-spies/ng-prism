import { booleanAttribute, computed, Directive, ElementRef, inject, input, signal } from '@angular/core';
import { Showcase } from '@ng-prism/core';
import { LIB_FORM_FIELD, LIB_FORM_FIELD_CONTROL, type LibFormFieldControl } from './form-field.tokens.js';

let nextId = 0;

/**
 * Makes a native `<input>` or `<textarea>` the control of the `lib-form-field` around it.
 *
 * The directive gives its element an id and the class `lib-input`, whose styles come with the field. It reports
 * `required` and `disabled` to the field and sets them, like `readonly`, on the element. The field's label names the
 * element through its `for`, and the field's hint or error describes it (`aria-describedby`).
 *
 * The element shows as invalid once it was left with a value the browser rejects, e.g. empty while required or not an
 * e-mail address in `type="email"`. The field then shows its error state, and the element gets `aria-invalid`.
 *
 * @since 1.6.0
 * @see FormFieldComponent
 * @example
 * ```html
 * <lib-form-field label="Name" error="Enter your name">
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
        { name: 'With hint', host: { template: '<lib-form-field label="Name" hint="As on your ID"><input libInput /></lib-form-field>' } },
        {
            name: 'Error',
            host: {
                template:
                    '<lib-form-field label="E-Mail" hint="We only use it for replies" error="Enter a valid e-mail address" invalid><input libInput type="email" /></lib-form-field>'
            }
        }
    ],
    tags: ['form', 'input', 'directive']
})
@Directive({
    selector: 'input[libInput], textarea[libInput]',
    standalone: true,
    providers: [{ provide: LIB_FORM_FIELD_CONTROL, useExisting: InputDirective }],
    host: {
        class: 'lib-input',
        '[id]': 'id()',
        '[required]': 'required()',
        '[disabled]': 'disabled()',
        '[readOnly]': 'readonly()',
        '[attr.aria-invalid]': 'ariaInvalid()',
        '[attr.aria-describedby]': 'ariaDescribedby()',
        '(input)': 'readValidity()',
        '(blur)': 'onBlur()'
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
    readonly id = signal(`lib-input-${nextId++}`).asReadonly();

    private readonly element = inject<ElementRef<HTMLInputElement | HTMLTextAreaElement>>(ElementRef).nativeElement;
    private readonly field = inject(LIB_FORM_FIELD, { optional: true });

    /** Whether the element has been left once. */
    private readonly touched = signal(false);

    /** The browser's verdict on the value, read again on every input and blur. */
    private readonly valid = signal(true);

    /** Whether the element shows as invalid by itself: left once with a value the browser rejects, and not disabled. */
    readonly showInvalid = computed(() => this.touched() && !this.valid() && !this.disabled());

    protected readonly ariaInvalid = computed(() => ((this.field ? this.field.errorState() : this.showInvalid()) ? 'true' : null));
    protected readonly ariaDescribedby = computed(() => this.field?.describedByIds().join(' ') || null);

    /** Focuses the element after a click on the field's box around it, unless it is disabled or focused already. */
    onContainerClick(): void {
        if (this.disabled() || this.element.ownerDocument.activeElement === this.element) return;
        this.element.focus();
    }

    protected onBlur(): void {
        this.touched.set(true);
        this.readValidity();
    }

    protected readValidity(): void {
        this.valid.set(this.element.validity.valid);
    }
}
