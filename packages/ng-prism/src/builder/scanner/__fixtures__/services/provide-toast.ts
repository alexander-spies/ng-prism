import { InjectionToken, type Provider } from '@angular/core';
import type { ToastConfig, ToastLabels } from './toast.model.js';

const TOAST_CONFIG = new InjectionToken<ToastConfig>('TOAST_CONFIG');

/**
 * Configures how toasts look and behave in the application.
 *
 * @example
 * ```ts
 * bootstrapApplication(AppComponent, {
 *     providers: [provideToast({ position: 'top-right', duration: 3000 })]
 * });
 * ```
 */
export function provideToast(config: ToastConfig = {}): Provider {
    return { provide: TOAST_CONFIG, useValue: config };
}

/** The texts of the toast, for an application that is not in English. */
export const TOAST_LABELS = new InjectionToken<ToastLabels>('TOAST_LABELS');
