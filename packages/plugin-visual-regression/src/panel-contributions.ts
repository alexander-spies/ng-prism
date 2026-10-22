import type { NavigationDecorationDefinition, PanelBadge, RuntimeComponent } from '@ng-prism/core/plugin';
import type { VrtComponentMeta } from './visual-regression.types.js';
import { isReviewStatus } from './vrt-summarize.js';

/**
 * The runtime contributions both entry points declare.
 *
 * `visual-regression-plugin.ts` carries the build-time hooks and must never be
 * reachable from a browser bundle, so the browser entry cannot import it. This
 * module holds what both entries share: no `node:` imports, no Angular, just
 * the predicates the panel definition needs.
 */

function componentMeta(component: RuntimeComponent): VrtComponentMeta | null {
    return (component.meta?.showcaseConfig?.meta?.['visualRegression'] as VrtComponentMeta | undefined) ?? null;
}

/** True when the plugin recorded at least one result for this component. */
export function hasResults(component: RuntimeComponent): boolean {
    const meta = componentMeta(component);

    return Boolean(meta?.found && meta.variants.length > 0);
}

/**
 * How many of this component's variants are waiting on a person.
 *
 * Uses the same predicate as the panel's first group, so the tab count and the
 * group header always agree. Red once anything changed, amber while the only
 * open items could not be compared (resized and new). Null when there is
 * nothing to review, so a clean component's tab shows no green "0".
 *
 * A single pass instead of calling `groupRows`: the panel host calls this from
 * its template on every change-detection pass for every visible tab, and
 * `PanelDefinition.badge` has to be cheap. `groupRows` would build all three
 * groups and filter the list five times.
 */
export function reviewBadge(component: RuntimeComponent): PanelBadge | null {
    const meta = componentMeta(component);

    if (!meta?.found) return null;

    let count = 0;
    let changed = false;

    for (const variant of meta.variants) {
        if (!isReviewStatus(variant.status)) continue;
        count++;
        if (variant.status === 'changed') changed = true;
    }
    if (count === 0) return null;

    // The same split statSummary draws for the sidebar and the gauge, so the
    // tab cannot be red while the marker for the same component is amber.
    return { kind: 'issues', text: String(count), tone: changed ? 'danger' : 'warn', label: `${count} to review` };
}

/**
 * The navigation marker. Reads the same pre-derived `summary` the component
 * head shows, so the sidebar and the head cannot disagree about a component.
 */
export const VRT_NAVIGATION_DECORATION: NavigationDecorationDefinition = {
    id: 'visual-regression',
    icon: 'camera',
    order: 20,
    badge: (component) => {
        const meta = componentMeta(component);

        if (!meta?.found || !meta.summary) return null;
        if (meta.summary.variant === 'ok') return null;
        return { variant: meta.summary.variant, label: meta.summary.label };
    }
};
