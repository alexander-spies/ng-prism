import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';
import { NotificationConfig } from './notification.model.js';

export const NOTIFICATION_CONFIG = new InjectionToken<NotificationConfig>('NOTIFICATION_CONFIG');

/**
 * Sets the app-wide defaults of `NotificationService`: where notifications stack and how long they stay.
 * Optional: without it they stack at the bottom right and close after 5000 ms.
 * @param config The defaults to override.
 * @since 1.4.0
 * @example
 * ```ts
 * providers: [provideNotifications({ position: 'top-right', duration: 8000 })]
 * ```
 */
export function provideNotifications(config: NotificationConfig = {}): EnvironmentProviders {
    return makeEnvironmentProviders([{ provide: NOTIFICATION_CONFIG, useValue: config }]);
}
