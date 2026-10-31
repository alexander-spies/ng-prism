/** Where on the screen notifications stack. */
export type NotificationPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

/** What a single notification shows and how long it stays. */
export interface NotificationOptions {
    /** Text of the notification. Plain text, HTML is not rendered. */
    message: string;
    /** Optional heading above the message. */
    title?: string;
    /**
     * Milliseconds until the notification closes by itself. Overrides the app-wide duration.
     * @default 5000
     */
    duration?: number;
}

/** App-wide defaults, set once with `provideNotifications()`. */
export interface NotificationConfig {
    /**
     * Where the notifications stack.
     * @default 'bottom-right'
     */
    position?: NotificationPosition;
    /**
     * Default time in milliseconds until a notification closes by itself.
     * @default 5000
     */
    duration?: number;
}
