import { InjectionToken, type Signal } from '@angular/core';

/** What `lib-form-field` tells the control inside it, provided under {@link LIB_FORM_FIELD}. */
export interface LibFormField {
    /** Id of the field's label, `null` while it has none. */
    readonly labelId: Signal<string | null>;
    /** Id of the field's hint, `null` while it has none. */
    readonly hintId: Signal<string | null>;
}

/** What a control inside `lib-form-field` tells the field, provided under {@link LIB_FORM_FIELD_CONTROL}. */
export interface LibFormFieldControl {
    /** Id of the native element, which the field's label points at. */
    readonly id: string;
    /** Whether the control is required: the field then marks its label. */
    readonly required: Signal<boolean>;
    /** Whether the control is disabled. */
    readonly disabled: Signal<boolean>;
}

/** The `lib-form-field` a control sits in. */
export const LIB_FORM_FIELD = new InjectionToken<LibFormField>('LIB_FORM_FIELD');

/** The control a `lib-form-field` frames, such as `libInput`. */
export const LIB_FORM_FIELD_CONTROL = new InjectionToken<LibFormFieldControl>('LIB_FORM_FIELD_CONTROL');
