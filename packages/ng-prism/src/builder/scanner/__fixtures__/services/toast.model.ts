import type { FeedbackColor } from './colors.js';

export type ToastPosition = 'top-right' | 'bottom-right';

/** A button inside the toast. */
export interface ToastAction {
    /** The text on the button. */
    label: string;
    /** Called when the button is clicked. */
    handler: () => void;
}

/** What a single toast shows. */
export interface ToastOptions {
    /** The text of the toast. */
    message: string;
    /** @default 'success' */
    color?: FeedbackColor;
    /** A button next to the message. */
    action?: ToastAction;
    /** Called when the toast closes, by timeout or by hand. */
    onClose?: () => void;
}

/** How toasts behave in the whole application. */
export interface ToastConfig {
    /** @default 'bottom-right' */
    position?: ToastPosition;
    /** @default 5000 */
    duration?: number;
}

/** The texts the toast needs from the application. */
export interface ToastLabels {
    /** The accessible name of the close button. */
    close: string;
}

/** @internal */
export interface ToastEntry {
    id: number;
    options: ToastOptions;
}

export enum ToastLevel {
    Low = 'low',
    High = 'high'
}
