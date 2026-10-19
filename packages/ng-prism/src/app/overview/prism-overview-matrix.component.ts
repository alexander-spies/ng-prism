import { ChangeDetectionStrategy, Component, computed, effect, input, linkedSignal, untracked } from '@angular/core';
import type { RuntimeComponent } from '../../plugin/plugin.types.js';
import type { StateFit } from '../pseudo/state-fit.js';
import { buildOverviewMatrix, columnFit, fitKey, fitLabel, statesFittingNowhere } from './overview-matrix.js';
import { PrismOverviewCellComponent } from './prism-overview-cell.component.js';

/**
 * The states a component has been warned about, by index. Module-level and weak,
 * so leaving the Overview and coming back does not repeat the warning, while a
 * rebuilt component (HMR) has its own.
 */
const warnedStates = new WeakMap<RuntimeComponent, Set<number>>();

/**
 * The Overview of a component with `states`: variants down, Default and every
 * state across, each intersection one `prism-overview-cell`.
 *
 * Whether a state fits a variant is something only the rendered cell knows, so
 * the cells report it (`fitChange`) and this component keeps the answers. The
 * column headers count them, and a state that fits no variant at all is warned
 * about once: it is almost certainly a selector that matches nothing.
 *
 * The first row and the first column stay in view while the matrix scrolls.
 */
@Component({
    selector: 'prism-overview-matrix',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [PrismOverviewCellComponent],
    templateUrl: './prism-overview-matrix.component.html',
    styleUrl: './prism-overview-matrix.component.css'
})
export class PrismOverviewMatrixComponent {
    readonly component = input.required<RuntimeComponent>();

    protected readonly matrix = computed(() => buildOverviewMatrix(this.component().meta.showcaseConfig));

    /** What each cell answered, by {@link fitKey}. Starts over with every component. */
    private readonly fits = linkedSignal<RuntimeComponent, ReadonlyMap<string, StateFit>>({
        source: this.component,
        computation: () => new Map()
    });

    /** The column titles with their fit counts, the Default column has none. */
    protected readonly headers = computed(() => {
        const fits = this.fits();
        const matrix = this.matrix();

        return matrix.columns.map((column) => {
            if (column.state === null) return { column, fit: null };

            const { fits: count, eligible } = columnFit(fits, matrix, column.state);

            return { column, fit: fitLabel(count, eligible) };
        });
    });

    constructor() {
        effect(() => {
            const component = this.component();
            const nowhere = statesFittingNowhere(this.fits(), this.matrix());

            untracked(() => this.warnAbout(component, nowhere));
        });
    }

    protected onFit(variant: number, state: number | null, fit: StateFit): void {
        if (state === null) return;
        this.fits.update((fits) => new Map(fits).set(fitKey(variant, state), fit));
    }

    private warnAbout(component: RuntimeComponent, states: readonly number[]): void {
        const warned = warnedStates.get(component) ?? new Set<number>();

        warnedStates.set(component, warned);

        for (const state of states) {
            if (warned.has(state)) continue;

            const name = component.meta.showcaseConfig.states?.[state]?.name;

            warned.add(state);
            console.warn(`[ng-prism] State "${name}" of ${component.meta.className} fits no variant; check its selectors.`);
        }
    }
}
