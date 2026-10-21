import type { ComponentStatus } from '../../decorator/showcase.types.js';
import type { NavigationDecorationDefinition } from '../../plugin/plugin.types.js';
import type { NavigationItem } from '../services/navigation-item.types.js';

/** One source's verdict on one component, resolved for rendering. */
export interface ItemMark {
    /**
     * The definition's id. `resolveNavigationDecorations` guarantees these are
     * unique, so this is the only field safe to `@for track` by. `icon` is a
     * free-form string on a public extension point and two sources can pick the
     * same one.
     */
    id: string;
    icon: string;
    variant: 'warn' | 'danger';
    label: string;
}

export interface ItemDecorations {
    /** Ordered marks, never empty (`decorateItem` returns null instead). */
    marks: ItemMark[];
    /** Worst variant across `marks`. Drives the group roll-up. */
    worst: 'warn' | 'danger';
    /** Newline-joined labels for the item's `title` attribute. */
    tooltip: string;
}

export interface CategoryRollup {
    /** Number of items in the category carrying at least one mark. */
    problems: number;
    /** Worst variant among them, or null for a clean category. */
    variant: 'warn' | 'danger' | null;
}

const SEVERITY: Record<'warn' | 'danger', number> = { warn: 1, danger: 2 };

/**
 * Built-ins first, then plugin contributions, de-duplicated by id and sorted
 * by `order`.
 *
 * Built-ins win a collision: a plugin must not be able to silence or restyle a
 * core source by claiming its id. Sorting is by `order` alone because the reading
 * contract says position names the source, so registration order must not leak
 * into the result.
 */
export function resolveNavigationDecorations(
    builtin: readonly NavigationDecorationDefinition[],
    fromPlugins: readonly NavigationDecorationDefinition[]
): NavigationDecorationDefinition[] {
    const seen = new Set<string>();
    const result: NavigationDecorationDefinition[] = [];

    for (const def of [...builtin, ...fromPlugins]) {
        if (seen.has(def.id)) continue;
        seen.add(def.id);
        result.push(def);
    }

    return result.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/**
 * Runs every definition against one item.
 *
 * Returns `null` rather than an empty result for a clean component, so callers
 * cannot accidentally render an empty marker container.
 */
export function decorateItem(item: NavigationItem, defs: readonly NavigationDecorationDefinition[]): ItemDecorations | null {
    if (item.kind !== 'component') return null;

    const marks: ItemMark[] = [];

    for (const def of defs) {
        const badge = def.badge(item.data);

        if (!badge) continue;
        marks.push({
            id: def.id,
            icon: def.icon,
            variant: badge.variant,
            label: badge.label
        });
    }

    if (marks.length === 0) return null;

    let worst: 'warn' | 'danger' = 'warn';

    for (const mark of marks) {
        if (SEVERITY[mark.variant] > SEVERITY[worst]) worst = mark.variant;
    }

    return { marks, worst, tooltip: marks.map((m) => m.label).join('\n') };
}

/**
 * Counts the items in one category that carry at least one mark.
 *
 * Items, not marks: a component with three findings is one thing to look at,
 * and a group head reading "3" for a single broken component would overstate
 * the work.
 *
 * Takes each item's already-resolved `ItemDecorations` rather than the raw
 * items. Callers already run `decorateItem` once per item to render its
 * marks, and recomputing it here would both waste the work and let the
 * roll-up drift from what actually renders.
 */
export function rollupCategory(decorations: readonly (ItemDecorations | null)[]): CategoryRollup {
    let problems = 0;
    let variant: 'warn' | 'danger' | null = null;

    for (const decoration of decorations) {
        if (!decoration) continue;
        problems++;
        if (!variant || SEVERITY[decoration.worst] > SEVERITY[variant]) {
            variant = decoration.worst;
        }
    }

    return { problems, variant };
}

/**
 * The lifecycle glyph for the sidebar's left slot.
 *
 * Shape only, never colour: a work-in-progress component must never read as a
 * finding. At 11px the previous pair (cube vs dashed square) was effectively
 * one glyph, so `wip` now uses a shape that differs in silhouette rather than
 * in stroke style.
 *
 * `idle` is the glyph of everything that is not work in progress: the box of a
 * component by default, another one for another kind of item (the plug of a
 * service). The dashed circle is shared, so work in progress reads the same
 * for every kind.
 */
export function lifecycleIcon(status: ComponentStatus | undefined, idle = 'box'): string {
    return status === 'wip' ? 'circle-dashed' : idle;
}
