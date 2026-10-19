import type { ShowcaseConfig } from '../../decorator/showcase.types.js';
import type { RuntimeComponent } from '../../plugin/plugin.types.js';
import { buildOverviewMatrix } from './overview-matrix.js';

/**
 * How many cells the Overview would hold for this config: the matrix's rows
 * times its columns, where a variant that opted out with `states: false` has
 * one cell instead of a row of them.
 */
export function overviewCellCount(config: ShowcaseConfig): number {
    const { columns, rows } = buildOverviewMatrix(config);

    return rows.reduce((cells, row) => cells + (row.optedOut ? 1 : columns.length), 0);
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
