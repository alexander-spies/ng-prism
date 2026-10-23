import { InjectionToken, type Signal } from '@angular/core';

/** What `lib-form-field` tells the control inside it, provided under {@link LIB_FORM_FIELD}. */
export interface LibFormField {
    /** Id of the field's label element, for a control that is not labelable and needs `aria-labelledby`. */
    readonly labelId: Signal<string>;
    /** Ids of the hint or error element the field shows right now, for the control's `aria-describedby`. */
    readonly describedByIds: Signal<readonly string[]>;
    /** The final error state: the field's `invalid` input or the control's own `showInvalid`. */
    readonly errorState: Signal<boolean>;
}

/** What a control inside `lib-form-field` tells the field, provided under {@link LIB_FORM_FIELD_CONTROL}. */
export interface LibFormFieldControl {
    /** Id of the focusable element, which the field's label points at. */
    readonly id: Signal<string>;
    /** Whether the control is disabled: the field dims its label and box. */
    readonly disabled: Signal<boolean>;
    /** Whether the control is required: the field marks its label. */
    readonly required: Signal<boolean>;
    /** Whether the control shows as invalid by itself, e.g. once it was left with an invalid value. */
    readonly showInvalid: Signal<boolean>;
    /** Called for a click on the field's box outside the control and the interactive elements in it. */
    onContainerClick(event: MouseEvent): void;
}

/** The `lib-form-field` a control sits in. */
export const LIB_FORM_FIELD = new InjectionToken<LibFormField>('LIB_FORM_FIELD');

/** The control a `lib-form-field` frames, such as `libInput`. */
export const LIB_FORM_FIELD_CONTROL = new InjectionToken<LibFormFieldControl>('LIB_FORM_FIELD_CONTROL');
