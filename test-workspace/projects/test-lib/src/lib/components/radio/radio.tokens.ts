import { InjectionToken, type Signal } from '@angular/core';

/** What `lib-radio-group` tells the radios inside it, provided under {@link LIB_RADIO_GROUP}. */
export interface LibRadioGroup {
    /** Name the radios of the group share. */
    readonly name: Signal<string>;
    /** Value of the selected radio. */
    readonly value: Signal<string>;
    /** Selects the radio with this value. */
    select(value: string): void;
}

/** The `lib-radio-group` a radio sits in. */
export const LIB_RADIO_GROUP = new InjectionToken<LibRadioGroup>('LIB_RADIO_GROUP');
