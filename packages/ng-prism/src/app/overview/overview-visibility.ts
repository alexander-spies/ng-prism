import type { ShowcaseConfig } from '../../decorator/showcase.types.js';
import type { RuntimeComponent } from '../../plugin/plugin.types.js';

/**
 * How many cells the Overview would hold for this config.
 *
 * Rows are the variants, with an implicit Default row when there are none (the
 * canvas renders that one too, so states on a variant-less component still
 * make a row). Every row is one cell, plus one per component state unless the
 * variant opts out with `states: false`.
 */
export function overviewCellCount(config: ShowcaseConfig): number {
    const stateCount = config.states?.length ?? 0;
    const variants = config.variants ?? [];

    if (variants.length === 0) return 1 + stateCount;
    return variants.reduce((cells, variant) => cells + 1 + (variant.states === false ? 0 : stateCount), 0);
}

/**
 * Whether the Overview tab is offered for this component.
 *
 * Two conditions, and the second is a correctness argument rather than taste.
 * A `renderPage` component does not render itself. It renders a registered
 * `ComponentPage`, and that page reads its values from the *global*
 * `PrismRendererService`. n cells side by side would all show the same state,
 * so an Overview there would be demonstrably wrong, not merely unhelpful.
 *
 * A single cell needs no contact sheet: the Playground says the same thing
 * better. A state counts as a cell, so one variant with one state already
 * earns the Overview.
 */
export function showsOverview(component: RuntimeComponent): boolean {
    const config = component.meta.showcaseConfig;

    if (config.renderPage) return false;
    return overviewCellCount(config) >= 2;
}
