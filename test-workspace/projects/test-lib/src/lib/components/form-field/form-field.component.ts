import { booleanAttribute, ChangeDetectionStrategy, Component, computed, contentChild, input, signal, ViewEncapsulation } from '@angular/core';
import { Showcase } from '@ng-prism/core';
import { LIB_FORM_FIELD, LIB_FORM_FIELD_CONTROL, type LibFormField } from './form-field.tokens.js';

/** A click on one of these is meant for that element, not for the control the box would focus. */
const INTERACTIVE_ELEMENTS =
    'button, a[href], input, textarea, select, label, [role="button"], [tabindex]:not([tabindex="-1"]), [contenteditable]:not([contenteditable="false"])';

let nextId = 0;

/**
 * Frame around a native form control: a label above it, a hint or an error below it and a box that holds the control
 * between an optional prefix and suffix.
 *
 * The control is a native `<input>` or `<textarea>` with `libInput`. The field finds it as content, points its label at
 * the control's id and marks the label while the control is required. The control in turn reads the field and takes
 * the hint or the error as its description. An element with `libPrefix`, such as a `lib-icon`, goes before the control,
 * one with `libSuffix`, such as a small button, after it. A click on the box focuses the control, except a click on a
 * button, a link or another control inside the box.
 *
 * The field is in its error state while `invalid` is set or the control shows as invalid by itself, which `libInput`
 * does once it was left with an invalid value. The `error` text then replaces the hint; without one the error shows by
 * colour alone.
 *
 * The styles of `libInput` live here, so a control looks right only inside a field.
 *
 * @since 1.6.0
 * @see InputDirective
 * @example
 * ```html
 * <lib-form-field label="E-Mail" hint="We only use it for replies" error="Enter a valid e-mail address">
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
    description: 'Label, hint or error, prefix and suffix slots around a native control with `libInput`, composed as a real Angular template.',
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
        { name: 'Note', inputs: { label: 'Note' }, template: '<textarea libInput cdkTextareaAutosize></textarea>' },
        {
            name: 'With hint',
            inputs: { label: 'E-Mail', hint: 'We only use it for replies' },
            template: '<input libInput type="email" />',
            // The demo of meta.a11y.accept: the A11y tab lists this under Accepted, with the reason, and does not count it.
            meta: {
                a11y: {
                    accept: [
                        {
                            rule: 'color-contrast',
                            reason: 'The hint grey (#6b7280) reaches 4.47:1 on the light ground, a hair under the 4.5:1 WCAG AA asks of small text. Kept as the demo of an accepted violation.'
                        }
                    ]
                }
            }
        },
        {
            name: 'Error',
            inputs: { label: 'E-Mail', hint: 'We only use it for replies', error: 'Enter a valid e-mail address', invalid: true },
            template: '<input libInput type="email" />'
        },
        {
            name: 'Suffix button',
            inputs: { label: 'Password' },
            template: `<input libInput #password type="password" /><button libSuffix type="button" aria-label="Show password" [attr.aria-pressed]="password.type === 'text'" (click)="password.type = password.type === 'password' ? 'text' : 'password'"><lib-icon name="eye" /></button>`
        },
        {
            // A field as wide as what it is placed in, rendered in a host template: stretch hands it the canvas, and with
            // Viewport width on the width set there.
            name: 'Full width',
            inputs: { label: 'E-Mail' },
            host: { template: '<lib-form-field style="width: 100%"><input libInput type="email" /></lib-form-field>' },
            canvasLayout: 'stretch'
        }
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
        '[class.lib-form-field--invalid]': 'errorState()',
        '[class.lib-form-field--disabled]': '!!control()?.disabled()'
    },
    template: `
        @if (label()) {
            <label class="lib-form-field__label" [id]="labelId()" [attr.for]="control()?.id() ?? null">
                {{ label() }}
                @if (control()?.required()) {
                    <span class="lib-form-field__required" aria-hidden="true">*</span>
                }
            </label>
        }
        <div class="lib-form-field__box" (click)="onBoxClick($event)">
            <ng-content select="[libPrefix]" />
            <ng-content />
            <ng-content select="[libSuffix]" />
        </div>
        @if (showError()) {
            <p class="lib-form-field__error" [id]="errorElementId">{{ error() }}</p>
        } @else if (hint()) {
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
            cursor: text;
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
            cursor: not-allowed;
        }
        /* After the hover rule of the same weight, so the error border stays while the pointer is over the box. */
        .lib-form-field--invalid .lib-form-field__box {
            border-color: #dc2626;
        }
        .lib-form-field--invalid .lib-form-field__box:has(.lib-input:focus-visible) {
            border-color: #dc2626;
            box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.25);
        }
        .lib-form-field__box > [libPrefix],
        .lib-form-field__box > [libSuffix] {
            color: #6b7280;
        }
        .lib-form-field__box > button[libSuffix] {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            margin-right: -6px;
            padding: 0;
            border: none;
            border-radius: 6px;
            background: transparent;
            cursor: pointer;
        }
        .lib-form-field__box > button[libSuffix]:hover {
            background: #f3f4f6;
            color: #374151;
        }
        .lib-form-field__box > button[libSuffix]:focus-visible {
            outline: 2px solid #6366f1;
            outline-offset: 0;
        }
        .lib-form-field__box > button[libSuffix][aria-pressed='true'] {
            color: #4f46e5;
        }
        .lib-form-field--disabled .lib-form-field__label {
            color: #9ca3af;
        }
        .lib-form-field__hint,
        .lib-form-field__error {
            margin: 0;
            font-size: 12px;
            color: #6b7280;
        }
        .lib-form-field__error {
            color: #dc2626;
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
    /** Shows the error state right away, on top of the control's own, e.g. for an error only a server knows about. */
    readonly invalid = input(false, { transform: booleanAttribute });

    /** Message in place of the hint while the field is in its error state. Without it the error shows by colour alone. */
    readonly error = input<string>('');

    /** Help text below the control, which the control takes as its description. Left out when empty and while the error shows. */
    readonly hint = input<string>('');

    /** Text of the label above the control. No label is rendered while it is empty. */
    readonly label = input<string>('');

    private readonly baseId = `lib-form-field-${nextId++}`;

    /** Id of the label element. */
    readonly labelId = signal(`${this.baseId}-label`).asReadonly();

    /** The final error state: `invalid` or the control's own `showInvalid`. */
    readonly errorState = computed(() => this.invalid() || !!this.control()?.showInvalid());

    /** Ids of the hint or error element the field shows right now. */
    readonly describedByIds = computed<readonly string[]>(() => {
        if (this.showError()) return [this.errorElementId];
        return this.hint() ? [this.hintElementId] : [];
    });

    protected readonly control = contentChild(LIB_FORM_FIELD_CONTROL);
    protected readonly showError = computed(() => this.errorState() && !!this.error());
    protected readonly hintElementId = `${this.baseId}-hint`;
    protected readonly errorElementId = `${this.baseId}-error`;

    protected onBoxClick(event: MouseEvent): void {
        const box = event.currentTarget as Element;
        const interactive = (event.target as Element | null)?.closest(INTERACTIVE_ELEMENTS);

        if (interactive && box.contains(interactive)) return;
        this.control()?.onContainerClick(event);
    }
}
