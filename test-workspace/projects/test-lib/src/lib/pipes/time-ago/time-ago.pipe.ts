import { inject, Pipe, PipeTransform } from '@angular/core';
import { Showcase } from '@ng-prism/core';
import { provideTimeAgo, TIME_AGO_OPTIONS } from './provide-time-ago.js';
import { TimeAgoOptions } from './time-ago.model.js';

const UNITS: readonly [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 365 * 24 * 60 * 60],
    ['month', 30 * 24 * 60 * 60],
    ['day', 24 * 60 * 60],
    ['hour', 60 * 60],
    ['minute', 60],
    ['second', 1]
];

/**
 * Writes a point in time relative to now: `3 hours ago`, or `in 2 days` for a time ahead.
 *
 * - The value is a `Date`, a timestamp in milliseconds or a string `Date` can parse.
 * - A time less than a minute away reads `now`.
 * - The pipe is pure: it does not update while the page stays open.
 *
 * @since 1.5.0
 * @example
 * ```html
 * <span>{{ comment.createdAt | timeAgo }}</span>
 * <span>{{ comment.createdAt | timeAgo: { style: 'short' } }}</span>
 * ```
 */
@Showcase({
    title: 'Time Ago',
    category: 'Formatting',
    setup: () => [provideTimeAgo]
})
@Pipe({ name: 'timeAgo' })
export class TimeAgoPipe implements PipeTransform {
    private readonly defaults = inject(TIME_AGO_OPTIONS, { optional: true });

    /**
     * Writes the time relative to now, in the app-wide style.
     * @param value The point in time: a `Date`, a timestamp in milliseconds or a date string.
     * @returns The relative time, e.g. `3 hours ago`.
     */
    transform(value: Date | number | string): string;
    /**
     * Writes the time relative to now, in the style given for this call.
     * @param value The point in time: a `Date`, a timestamp in milliseconds or a date string.
     * @param options Overrides the app-wide options for this call.
     * @returns The relative time, e.g. `3 hr. ago`.
     */
    transform(value: Date | number | string, options: Partial<TimeAgoOptions>): string;
    transform(value: Date | number | string, options: Partial<TimeAgoOptions> = {}): string {
        const style = options.style ?? this.defaults?.style ?? 'long';
        const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
        const format = new Intl.RelativeTimeFormat('en', { style, numeric: 'auto' });

        if (Math.abs(seconds) < 60) return format.format(0, 'second');

        const [unit, unitSeconds] = UNITS.find(([, length]) => Math.abs(seconds) >= length) ?? UNITS[UNITS.length - 1];

        return format.format(Math.trunc(seconds / unitSeconds), unit);
    }
}
