import { InjectionToken, type Provider } from '@angular/core';
import type { TimeAgoOptions } from './time-ago.model.js';

/** The options every `timeAgo` in the application starts from. */
export const TIME_AGO_OPTIONS = new InjectionToken<TimeAgoOptions>('TIME_AGO_OPTIONS');

/** Sets the options every `timeAgo` in the application starts from. */
export function provideTimeAgo(options: Partial<TimeAgoOptions> = {}): Provider {
    return { provide: TIME_AGO_OPTIONS, useValue: options };
}
