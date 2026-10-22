/** How much a moment is spelled out: "3 minutes ago" or "3m ago". */
export type TimeAgoStyle = 'long' | 'short';

/** How `timeAgo` formats a moment. */
export interface TimeAgoOptions {
    /** @default 'long' */
    style?: TimeAgoStyle;
}
