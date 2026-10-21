import type { ShowcaseConfig } from '../../decorator/showcase.types.js';
import type { NavigationItem } from './navigation-item.types.js';

/** The `@Showcase` config behind a component or a service, `undefined` for a page, which has none. */
export function itemShowcaseConfig(item: NavigationItem): ShowcaseConfig | undefined {
    return item.kind === 'page' ? undefined : item.data.meta.showcaseConfig;
}

/**
 * Identifies an item in a list. The prefixes keep a service and a page from
 * colliding with a component of the same name or title.
 */
export function itemKey(item: NavigationItem): string {
    switch (item.kind) {
        case 'component':
            return item.data.meta.className;
        case 'service':
            return `service:${item.data.meta.className}`;
        case 'page':
            return `page:${item.data.title}`;
    }
}
