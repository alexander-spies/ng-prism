import type { NavigationDecorationDefinition, RuntimeComponent } from '@ng-prism/core/plugin';
import type { CoverageData } from './coverage.types.js';

/**
 * The runtime contributions both entry points declare. `coverage-plugin.ts`
 * carries the build-time hook and must never be reachable from a browser
 * bundle, so the browser entry cannot import through it.
 */
function componentMeta(component: RuntimeComponent): CoverageData | null {
    return (component.meta?.showcaseConfig?.meta?.['coverage'] as CoverageData | undefined) ?? null;
}

export const COVERAGE_NAVIGATION_DECORATION: NavigationDecorationDefinition = {
    id: 'coverage',
    icon: 'shield-check',
    order: 30,
    badge: (component) => {
        const meta = componentMeta(component);

        if (!meta?.found || !meta.summary) return null;
        if (meta.summary.variant === 'ok') return null;
        return { variant: meta.summary.variant, label: meta.summary.label };
    }
};
