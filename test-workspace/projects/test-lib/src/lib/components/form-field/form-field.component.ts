import { ChangeDetectionStrategy, Component, computed, contentChild, input, ViewEncapsulation } from '@angular/core';
import { Showcase } from '@ng-prism/core';
import { LIB_FORM_FIELD, LIB_FORM_FIELD_CONTROL, type LibFormField } from './form-field.tokens.js';

let nextId = 0;

/**
 * Frame around a native form control: a label above it, a hint below it and a box that holds the control and an
 * optional prefix.
 *
 * The control is a native `<input>` or `<textarea>` with `libInput`. The field finds it as content, points its label at
 * the control's id and marks the label while the control is required. The control in turn reads the field and takes
 * the label and the hint as its accessible name and description. An element with `libPrefix`, such as a `lib-icon`,
 * goes before the control.
 *
 * The styles of `libInput` live here, so a control looks right only inside a field.
 *
 * @since 1.6.0
 * @see InputDirective
 * @example
 * ```html
 * <lib-form-field label="E-Mail" hint="We never share it">
 *   <input libInput type="email" required />
 * </lib-form-field>
 * ```
 * @example
 * ```html
 * <lib-form-field label="Search">
 *   <lib-icon libPrefix name="search" />
 *   <input libInput />
 * </lib-form-field>
 * ```
 */
@Showcase<FormFieldComponent>({
    title: 'Form Field',
    category: 'Forms',
    description: 'Label, hint and prefix slot around a native control with `libInput`, composed as a real Angular template.',
    imports: [{ name: 'CdkTextareaAutosize', from: '@angular/cdk/text-field' }],
    bg: 'light',
    states: [
        { name: 'Hover', pseudo: { hover: '.lib-form-field__box' } },
        { name: 'Focus visible', pseudo: { 'focus-visible': '.lib-input' } }
    ],
    variants: [
        { name: 'Default', inputs: { label: 'E-Mail' }, template: '<input libInput type="email" />' },
        { name: 'Required', inputs: { label: 'E-Mail' }, template: '<input libInput type="email" required />' },
        { name: 'Disabled', inputs: { label: 'E-Mail' }, template: '<input libInput disabled />' },
        { name: 'With icon', inputs: { label: 'Search' }, template: '<lib-icon libPrefix name="search" /><input libInput />' },
        { name: 'Note', inputs: { label: 'Note' }, template: '<textarea libInput cdkTextareaAutosize></textarea>' }
    ],
    tags: ['form', 'field', 'label', 'input']
})
@Component({
    selector: 'lib-form-field',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    providers: [{ provide: LIB_FORM_FIELD, useExisting: FormFieldComponent }],
    host: {
        class: 'lib-form-field',
        '[class.lib-form-field--disabled]': '!!control()?.disabled()'
    },
    template: `
        @if (label()) {
            <label class="lib-form-field__label" [id]="labelElementId" [attr.for]="control()?.id ?? null">
                {{ label() }}
                @if (control()?.required()) {
                    <span class="lib-form-field__required" aria-hidden="true">*</span>
                }
            </label>
        }
        <div class="lib-form-field__box">
            <ng-content select="[libPrefix]" />
            <ng-content />
        </div>
        @if (hint()) {
            <p class="lib-form-field__hint" [id]="hintElementId">{{ hint() }}</p>
        }
    `,
    styles: `
        .lib-form-field {
            display: flex;
            flex-direction: column;
            gap: 6px;
            width: 280px;
            font-family: inherit;
        }
        .lib-form-field__label {
            font-size: 13px;
            font-weight: 500;
            color: #374151;
        }
        .lib-form-field__required {
            margin-left: 2px;
            color: #dc2626;
        }
        .lib-form-field__box {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 0 12px;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            background: #fff;
            transition:
                border-color 0.15s,
                box-shadow 0.15s;
        }
        .lib-form-field__box:hover {
            border-color: #6b7280;
        }
        .lib-form-field__box:has(.lib-input:focus-visible) {
            border-color: #6366f1;
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);
        }
        .lib-form-field__box:has(.lib-input:disabled) {
            border-color: #e5e7eb;
            background: #f9fafb;
        }
        .lib-form-field__box > [libPrefix] {
            color: #6b7280;
        }
        .lib-form-field--disabled .lib-form-field__label {
            color: #9ca3af;
        }
        .lib-form-field__hint {
            margin: 0;
            font-size: 12px;
            color: #6b7280;
        }
        .lib-input {
            flex: 1;
            min-width: 0;
            padding: 9px 0;
            border: none;
            outline: none;
            background: transparent;
            font: inherit;
            font-size: 14px;
            color: #111827;
        }
        .lib-input:disabled {
            color: #9ca3af;
            cursor: not-allowed;
        }
        /* Spacing as margin: an autosize directive sets the height from the content alone. */
        textarea.lib-input {
            margin: 9px 0;
            padding: 0;
            resize: none;
        }
    `
})
export class FormFieldComponent implements LibFormField {
    /** Text of the label above the control. No label is rendered while it is empty. */
    readonly label = input<string>('');

    /** Help text below the control, which the control takes as its description. Left out when empty. */
    readonly hint = input<string>('');

    /** Id of the label element, `null` while there is no label. */
    readonly labelId = computed(() => (this.label() ? this.labelElementId : null));

    /** Id of the hint element, `null` while there is no hint. */
    readonly hintId = computed(() => (this.hint() ? this.hintElementId : null));

    protected readonly control = contentChild(LIB_FORM_FIELD_CONTROL);
    protected readonly labelElementId = `lib-form-field-label-${nextId}`;
    protected readonly hintElementId = `lib-form-field-hint-${nextId++}`;
}
