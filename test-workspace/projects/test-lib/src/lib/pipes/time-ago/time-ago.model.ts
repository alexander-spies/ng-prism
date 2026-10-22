/** How the relative time is written: `3 hours ago` (long) or `3 hr. ago` (short). */
export type TimeAgoStyle = 'long' | 'short';

/** What `TimeAgoPipe` can be configured with, app-wide or for one call. */
export interface TimeAgoOptions {
    /**
     * How the relative time is written.
     * @default 'long'
     */
    style?: TimeAgoStyle;
}
