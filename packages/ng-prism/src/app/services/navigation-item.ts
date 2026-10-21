import type { ShowcaseConfig } from '../../decorator/showcase.types.js';
import type { NavigationItem } from './navigation-item.types.js';

/** The `@Showcase` config behind a component, a service or a pipe, `undefined` for a page, which has none. */
export function itemShowcaseConfig(item: NavigationItem): ShowcaseConfig | undefined {
    return item.kind === 'page' ? undefined : item.data.meta.showcaseConfig;
}

/**
 * Identifies an item in a list. The prefixes keep a service, a pipe and a page
 * from colliding with a component of the same name or title.
 */
export function itemKey(item: NavigationItem): string {
    switch (item.kind) {
        case 'component':
            return item.data.meta.className;
        case 'service':
            return `service:${item.data.meta.className}`;
        case 'pipe':
            return `pipe:${item.data.meta.className}`;
        case 'page':
            return `page:${item.data.title}`;
    }
}
