import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';
import { TimeAgoOptions } from './time-ago.model.js';

export const TIME_AGO_OPTIONS = new InjectionToken<Partial<TimeAgoOptions>>('TIME_AGO_OPTIONS');

/**
 * Sets the app-wide defaults of `TimeAgoPipe`: how the relative time is written.
 * Optional: without it the pipe writes the long form, `3 hours ago`.
 * @param options The defaults to override.
 * @since 1.5.0
 * @example
 * ```ts
 * providers: [provideTimeAgo({ style: 'short' })]
 * ```
 */
export function provideTimeAgo(options: Partial<TimeAgoOptions> = {}): EnvironmentProviders {
    return makeEnvironmentProviders([{ provide: TIME_AGO_OPTIONS, useValue: options }]);
}
