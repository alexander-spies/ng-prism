import { computed, inject, Injectable, signal } from '@angular/core';
import { Showcase } from '@ng-prism/core';
import { NotificationRef } from './notification-ref.js';
import { NotificationOptions } from './notification.model.js';
import { NOTIFICATION_CONFIG, provideNotifications } from './provide-notifications.js';

interface OpenNotification {
    id: number;
    options: NotificationOptions;
}

/**
 * Shows short messages in an overlay at the edge of the viewport, stacked newest first.
 *
 * - A notification closes after the configured duration (5000 ms by default), see `provideNotifications()`.
 * - `show()` returns a `NotificationRef`, so the caller can close that one notification early.
 * - `dismissAll()` closes every open notification at once.
 *
 * @since 1.4.0
 * @example
 * ```ts
 * private readonly notifications = inject(NotificationService);
 *
 * save(): void {
 *     this.notifications.show({ message: 'Saved' });
 * }
 * ```
 */
@Showcase({
    title: 'Notification Service',
    category: 'Feedback',
    status: 'beta',
    setup: () => [provideNotifications]
})
@Injectable({ providedIn: 'root' })
export class NotificationService {
    private readonly config = inject(NOTIFICATION_CONFIG, { optional: true });
    private readonly open = signal<readonly OpenNotification[]>([]);
    private nextId = 1;

    /** How many notifications are open right now. */
    readonly count = computed(() => this.open().length);

    /**
     * Opens a notification. It closes by itself after its duration.
     * @param options What the notification shows and how long it stays.
     * @returns A handle to close this notification early.
     */
    show(options: NotificationOptions): NotificationRef {
        const id = this.nextId++;

        this.open.update((open) => [{ id, options }, ...open]);

        const duration = options.duration ?? this.config?.duration ?? 5000;

        setTimeout(() => this.dismiss(id), duration);

        return new NotificationRef(id, (closed) => this.dismiss(closed));
    }

    /** Closes every open notification. */
    dismissAll(): void {
        this.open.set([]);
    }

    private dismiss(id: number): void {
        this.open.update((open) => open.filter((notification) => notification.id !== id));
    }
}
