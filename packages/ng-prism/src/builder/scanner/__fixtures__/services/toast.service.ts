import { Injectable, OnDestroy, signal } from '@angular/core';
import { provideToast, TOAST_LABELS } from './provide-toast.js';
import { Showcase } from './showcase.js';
import { ToastRef } from './toast-ref.js';
import { type ToastConfig, type ToastEntry, ToastLevel, type ToastOptions } from './toast.model.js';

export class ToastBase {
    /** Empties the queue and closes what is on screen. */
    reset(): void {}

    show(options: ToastOptions): ToastRef {
        return new ToastRef();
    }
}

/**
 * Shows short messages next to the page.
 *
 * - Toasts stack, the newest one on top.
 * - A toast closes by itself after its duration.
 *
 * @since 1.2.0
 * @example
 * ```typescript
 * inject(ToastService).show({ message: 'Saved' });
 * ```
 */
@Showcase({ title: 'Toast Service', category: 'Feedback', setup: () => [provideToast, TOAST_LABELS] })
@Injectable({ providedIn: 'root' })
export class ToastService extends ToastBase implements OnDestroy {
    /** How many toasts are on screen. */
    readonly count = signal(0);

    protected base = 'toast';

    private _queue: ToastOptions[] = [];

    // eslint-disable-next-line no-unused-private-class-members -- a # member nobody reads is what this fixture is about
    #secret = 1;

    get isEmpty(): boolean {
        return this._queue.length === 0;
    }

    /**
     * Puts a toast on screen.
     *
     * @param options What to show.
     */
    show(options: ToastOptions): ToastRef {
        this._queue.push(options);

        return new ToastRef();
    }

    dismissAll() {
        this._queue = [];
    }

    /** @deprecated Use show(). */
    open(message: string): void {
        this.show({ message });
    }

    _internal(): void {}

    /** @internal */
    debug(): void {}

    ngOnDestroy(): void {
        this.dismissAll();
    }

    readonly level = signal<ToastLevel>(ToastLevel.Low);

    private entries: ToastEntry[] = [];

    history(): readonly ToastRef[] {
        return this.entries.map(() => new ToastRef());
    }

    configure(config: Partial<ToastConfig>): void {}

    static create(): ToastService {
        return new ToastService();
    }
}
