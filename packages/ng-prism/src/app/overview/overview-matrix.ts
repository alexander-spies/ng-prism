import type { ShowcaseConfig } from '../../decorator/showcase.types.js';
import { type ForcedPseudoStates, PSEUDO_STATES, type PseudoState } from '../../shared/pseudo-state.type.js';
import { forcesAnyState, hasTarget } from '../pseudo/pseudo-targets.js';
import { describeTarget, type StateFit } from '../pseudo/state-fit.js';

/** `state` is the position in `ShowcaseConfig.states`, `null` for the Default column. */
export interface MatrixColumn {
    state: number | null;
    title: string;
    signature: string;
    /** Whether the column's state forces anything. `false` for Default and for a slot the scanner could not use. */
    forcesState: boolean;
}

/** `variant` is the position in `ShowcaseConfig.variants`; the implicit Default row of a variant-less component is 0. */
export interface MatrixRow {
    variant: number;
    title: string;
    /** `bg: dark` or `states: false`: the row header's tooltip. */
    note: string | null;
    optedOut: boolean;
}

export interface OverviewMatrix {
    columns: MatrixColumn[];
    rows: MatrixRow[];
}

/**
 * The Overview as a matrix: a row per variant, a column for Default and one
 * per component state.
 *
 * A component without variants still renders, as a variant of its own, so it
 * gets one implicit `Default` row, like the canvas. A variant that opts out
 * with `states: false` keeps its row but takes part in no state column.
 */
export function buildOverviewMatrix(config: ShowcaseConfig): OverviewMatrix {
    const columns: MatrixColumn[] = [
        { state: null, title: 'Default', signature: 'no state', forcesState: false },
        ...(config.states ?? []).map((state, index) => ({
            state: index,
            title: state.name,
            signature: pseudoSignature(state.pseudo),
            forcesState: forcesAnyState(state.pseudo)
        }))
    ];
    const variants = config.variants ?? [];
    const rows: MatrixRow[] =
        variants.length === 0
            ? [{ variant: 0, title: 'Default', note: null, optedOut: false }]
            : variants.map((variant, index) => ({
                  variant: index,
                  title: variant.name,
                  note: variant.states === false ? 'states: false' : variant.bg ? `bg: ${variant.bg}` : null,
                  optedOut: variant.states === false
              }));

    return { columns, rows };
}

/**
 * What a state forces, in a line: `hover + active → .btn`.
 *
 * The pseudo-classes come in {@link PSEUDO_STATES} order, grouped by the target
 * they share. Classes with different targets make one group each, joined with
 * `; ` (`hover → .pill; focus-visible → .pill__close`). A slot that names no
 * target forces nothing, as the marker sees it.
 */
export function pseudoSignature(pseudo: ForcedPseudoStates): string {
    const groups = new Map<string, PseudoState[]>();

    for (const state of PSEUDO_STATES) {
        const target = pseudo[state];

        if (target === undefined || !hasTarget(target)) continue;

        const label = describeTarget(target);

        groups.set(label, [...(groups.get(label) ?? []), state]);
    }

    if (groups.size === 0) return 'forces no state';
    return Array.from(groups, ([label, states]) => `${states.join(' + ')} → ${label}`).join('; ');
}

/** A column's fit count: short in the header, spelled out in its tooltip. */
export interface FitLabel {
    text: string;
    title: string;
}

/** `2/5`: the variants a state fits, of those it is combined with. */
export function fitLabel(fits: number, total: number): FitLabel {
    return { text: `${fits}/${total}`, title: `State applies to ${fits} of ${total} ${total === 1 ? 'variant' : 'variants'}` };
}

/** Key of one cell's result in the map the matrix collects from the cells. */
export function fitKey(variant: number, state: number): string {
    return `${variant}:${state}`;
}

export interface ColumnFit {
    /** Cells of the column whose state fits. */
    fits: number;
    /** Cells the column has: the rows that did not opt out. */
    eligible: number;
    /** Whether every one of those cells has answered. */
    complete: boolean;
}

/** The fits of one state column, as far as the cells have answered. */
export function columnFit(results: ReadonlyMap<string, StateFit>, matrix: OverviewMatrix, state: number): ColumnFit {
    const rows = matrix.rows.filter((row) => !row.optedOut);
    const answers = rows.map((row) => results.get(fitKey(row.variant, state))).filter((answer): answer is StateFit => answer !== undefined);

    return { fits: answers.filter((answer) => answer.fits).length, eligible: rows.length, complete: answers.length === rows.length };
}

/**
 * The states whose column is complete and fits nowhere, by index: almost
 * certainly a selector with a typo.
 *
 * A column that is still waiting for a cell, or whose cell failed to render and
 * so never answers, is not complete: a state is only called misplaced once every
 * cell has had its say. A state no variant is combined with has no cell to
 * judge it, so it is not reported either. Nor is a state that forces nothing (a
 * slot the scanner could not use): it fits nowhere by construction, has no
 * selector to check, and the scanner has reported it already.
 *
 * Stateless: the caller keeps track of what it already reported.
 */
export function statesFittingNowhere(results: ReadonlyMap<string, StateFit>, matrix: OverviewMatrix): number[] {
    return matrix.columns.flatMap((column) => {
        if (column.state === null || !column.forcesState) return [];

        const { fits, eligible, complete } = columnFit(results, matrix, column.state);

        return eligible > 0 && complete && fits === 0 ? [column.state] : [];
    });
}

/** One column header of the matrix. */
export interface ColumnHeader {
    column: MatrixColumn;
    /** `x/y` and its tooltip, `null` for the Default column. */
    fit: FitLabel | null;
    /** The state is one of {@link statesFittingNowhere}. */
    fitsNowhere: boolean;
}

/** The column headers with their fit counts, and whether a state fits no variant, as far as the cells have answered. */
export function columnHeaders(results: ReadonlyMap<string, StateFit>, matrix: OverviewMatrix): ColumnHeader[] {
    const nowhere = new Set(statesFittingNowhere(results, matrix));

    return matrix.columns.map((column) => {
        if (column.state === null) return { column, fit: null, fitsNowhere: false };

        const { fits, eligible } = columnFit(results, matrix, column.state);

        return { column, fit: fitLabel(fits, eligible), fitsNowhere: nowhere.has(column.state) };
    });
}
