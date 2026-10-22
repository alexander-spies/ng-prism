import { inject, Pipe, type PipeTransform } from '@angular/core';
import { provideTimeAgo, TIME_AGO_OPTIONS } from './provide-time-ago.js';
import { Showcase } from './showcase.js';
import type { TimeAgoOptions } from './time-ago.model.js';

/**
 * Says how long ago a moment was, such as "3 minutes ago".
 *
 * @since 2.0.0
 */
@Showcase({ title: 'Time ago', category: 'Formatting', setup: () => [provideTimeAgo] })
@Pipe({ name: 'timeAgo' })
export class TimeAgoPipe implements PipeTransform {
    private readonly defaults = inject(TIME_AGO_OPTIONS);

    /**
     * Formats a moment in the style the application configured.
     *
     * @param value The moment, as a date or in milliseconds since the epoch.
     */
    transform(value: Date | number): string;
    /**
     * Formats a moment in a style of its own.
     *
     * @param value The moment, as a date or in milliseconds since the epoch.
     * @param options Replaces the configured options for this call.
     */
    transform(value: Date | number, options: Partial<TimeAgoOptions>): string;
    transform(value: Date | number, options: Partial<TimeAgoOptions> = {}): string {
        const minutes = Math.round((Date.now() - +value) / 60_000);

        return (options.style ?? this.defaults.style) === 'short' ? `${minutes}m ago` : `${minutes} minutes ago`;
    }
}
