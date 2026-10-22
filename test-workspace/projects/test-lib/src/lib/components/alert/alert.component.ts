import { ChangeDetectionStrategy, Component, input, model, output, ViewEncapsulation } from '@angular/core';
import { Showcase } from '@ng-prism/core';

/** Severity of an alert. Sets its colours and how urgent it reads. */
export type AlertSeverityType = 'info' | 'success' | 'warning' | 'error';

/**
 * Inline alert banner for a message about the content around it.
 *
 * ## Severities
 *
 * - `info`: neutral news, e.g. a new version is available
 * - `success`: confirms that an action worked
 * - `warning`: something needs attention before it becomes a problem
 * - `error`: an action failed or data could not be loaded
 *
 * The host carries `role="alert"`, so screen readers announce the message as soon as the alert appears.
 * With `dismissible` the alert gets a close button that sets `visible` to `false` and emits `dismissed`.
 *
 * @since 1.0.0
 * @see AlertSeverityType
 * @example
 * ```html
 * <sg-alert severity="success" message="Changes saved." />
 * ```
 * @example
 * ```html
 * <sg-alert
 *   severity="warning"
 *   title="Attention"
 *   message="Your session expires in 5 minutes."
 *   [dismissible]="true"
 *   (dismissed)="snooze()" />
 * ```
 */
@Showcase({
    title: 'Alert',
    status: 'stable',
    category: 'Feedback',
    description: 'Contextual alert banner with severity variants and optional dismiss button.',
    variants: [
        { name: 'Info', inputs: { severity: 'info', message: 'A new version is available.' } },
        { name: 'Success', inputs: { severity: 'success', message: 'Changes saved successfully.' } },
        { name: 'Warning', inputs: { severity: 'warning', message: 'Your session expires in 5 minutes.' } },
        { name: 'Error', inputs: { severity: 'error', message: 'Failed to load data. Please retry.' } },
        { name: 'Dismissible', inputs: { severity: 'info', message: 'Click X to dismiss.', dismissible: true } },
        { name: 'With Title', inputs: { severity: 'warning', title: 'Attention', message: 'Please review your changes.' } }
    ],
    tags: ['feedback', 'alert', 'notification', 'message']
})
@Component({
    selector: 'sg-alert',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: {
        class: 'sg-alert',
        '[attr.data-severity]': 'severity()',
        '[attr.role]': '"alert"'
    },
    template: `
        @if (visible()) {
            <div class="sg-alert__body">
                <div class="sg-alert__content">
                    @if (title()) {
                        <strong class="sg-alert__title">{{ title() }}</strong>
                    }
                    <span class="sg-alert__message">{{ message() }}</span>
                </div>
                @if (dismissible()) {
                    <button class="sg-alert__close" aria-label="Dismiss" (click)="dismiss()">
                        <svg viewBox="0 0 16 16" width="16" height="16">
                            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" fill="none" />
                        </svg>
                    </button>
                }
            </div>
        }
    `,
    styles: `
        .sg-alert {
            display: block;
        }
        .sg-alert__body {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            padding: 10px 14px;
            border-radius: 8px;
            border-left: 4px solid;
            font-size: 13px;
            line-height: 1.5;
        }
        .sg-alert[data-severity='info'] .sg-alert__body {
            background: #eff6ff;
            border-color: #3b82f6;
            color: #1e40af;
        }
        .sg-alert[data-severity='success'] .sg-alert__body {
            background: #f0fdf4;
            border-color: #22c55e;
            color: #166534;
        }
        .sg-alert[data-severity='warning'] .sg-alert__body {
            background: #fffbeb;
            border-color: #f59e0b;
            color: #92400e;
        }
        .sg-alert[data-severity='error'] .sg-alert__body {
            background: #fef2f2;
            border-color: #ef4444;
            color: #991b1b;
        }
        .sg-alert__content {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 2px;
        }
        .sg-alert__title {
            font-weight: 600;
        }
        .sg-alert__close {
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            border: none;
            background: transparent;
            color: inherit;
            opacity: 0.6;
            cursor: pointer;
            border-radius: 4px;
            padding: 0;
        }
        .sg-alert__close:hover {
            opacity: 1;
            background: rgba(0, 0, 0, 0.06);
        }
    `
})
export class AlertComponent {
    /** Severity of the message, see {@link AlertSeverityType}. Sets the background and the accent border. */
    readonly severity = input<AlertSeverityType>('info');

    /** The message itself, as plain text. */
    readonly message = input.required<string>();

    /** Optional heading, shown in **bold** above the message. Left out when empty. */
    readonly title = input<string>('');

    /** Adds a close button that hides the alert and emits `dismissed`. */
    readonly dismissible = input<boolean>(false);

    /**
     * Whether the alert is shown. Two-way bindable with `[(visible)]`, so a dismissed alert can be brought back.
     * @since 1.2.0
     */
    readonly visible = model<boolean>(true);

    /** Emits after the user closed the alert. Not emitted when `visible` is set from outside. */
    readonly dismissed = output<void>();

    /** Hides the alert and emits `dismissed`, as the close button does. */
    dismiss(): void {
        this.visible.set(false);
        this.dismissed.emit();
    }

    /** Shows the alert again after it was dismissed. Does not emit. */
    show(): void {
        this.visible.set(true);
    }
}
