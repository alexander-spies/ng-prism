import type { ShowcaseConfig } from '../../decorator/showcase.types.js';
import type { StateFit } from '../pseudo/state-fit.js';
import { buildOverviewMatrix, columnFit, columnHeaders, fitKey, fitLabel, type OverviewMatrix, pseudoSignature, statesFittingNowhere } from './overview-matrix.js';

const FITS: StateFit = { fits: true };
const MISFIT: StateFit = { fits: false, reason: '.btn matches nothing' };

function results(entries: readonly (readonly [number, number, StateFit])[]): Map<string, StateFit> {
    return new Map(entries.map(([variant, state, fit]) => [fitKey(variant, state), fit]));
}

describe('buildOverviewMatrix', () => {
    it('builds a Default column and one column per state', () => {
        const config: ShowcaseConfig = {
            title: 'Button',
            variants: [{ name: 'Primary' }],
            states: [
                { name: 'Hover', pseudo: { hover: '.btn' } },
                { name: 'Pressed', pseudo: { hover: '.btn', active: '.btn' } }
            ]
        };

        expect(buildOverviewMatrix(config).columns).toEqual([
            { state: null, title: 'Default', signature: 'no state', forcesState: false },
            { state: 0, title: 'Hover', signature: 'hover → .btn', forcesState: true },
            { state: 1, title: 'Pressed', signature: 'hover + active → .btn', forcesState: true }
        ]);
    });

    it('marks an opted-out row and notes bg', () => {
        const config: ShowcaseConfig = {
            title: 'Button',
            variants: [{ name: 'Primary' }, { name: 'Ghost', states: false, bg: 'dark' }, { name: 'Inverse', bg: 'dark' }],
            states: [{ name: 'Hover', pseudo: { hover: true } }]
        };

        expect(buildOverviewMatrix(config).rows).toEqual([
            { variant: 0, title: 'Primary', note: null, optedOut: false },
            { variant: 1, title: 'Ghost', note: 'states: false', optedOut: true },
            { variant: 2, title: 'Inverse', note: 'bg: dark', optedOut: false }
        ]);
    });

    it('adds an implicit Default row without variants', () => {
        const config: ShowcaseConfig = {
            title: 'Button',
            states: [{ name: 'Hover', pseudo: { hover: true } }]
        };

        expect(buildOverviewMatrix(config).rows).toEqual([{ variant: 0, title: 'Default', note: null, optedOut: false }]);
    });

    it('adds the implicit Default row for an empty variant list, too', () => {
        const config: ShowcaseConfig = { title: 'Button', variants: [], states: [{ name: 'Hover', pseudo: { hover: true } }] };

        expect(buildOverviewMatrix(config).rows).toEqual([{ variant: 0, title: 'Default', note: null, optedOut: false }]);
    });

    it('keeps the position in the source as the state index, whatever the slot holds', () => {
        const config: ShowcaseConfig = {
            title: 'Button',
            states: [
                { name: 'Empty', pseudo: {} },
                { name: 'Hover', pseudo: { hover: true } }
            ]
        };

        expect(buildOverviewMatrix(config).columns.map(({ state, signature, forcesState }) => [state, signature, forcesState])).toEqual([
            [null, 'no state', false],
            [0, 'forces no state', false],
            [1, 'hover → the component', true]
        ]);
    });

    it('has only the Default column for a component without states', () => {
        const matrix = buildOverviewMatrix({ title: 'Button', variants: [{ name: 'Primary' }] });

        expect(matrix.columns).toEqual([{ state: null, title: 'Default', signature: 'no state', forcesState: false }]);
    });
});

describe('pseudoSignature', () => {
    it('joins the pseudo-classes of one target with +', () => {
        expect(pseudoSignature({ hover: '.btn', active: '.btn' })).toBe('hover + active → .btn');
    });

    it('lists the pseudo-classes in the order the tools menu does, whatever the declaration order', () => {
        expect(pseudoSignature({ active: '.btn', hover: '.btn' })).toBe('hover + active → .btn');
    });

    it('separates groups of different targets with ;', () => {
        expect(pseudoSignature({ hover: '.pill', 'focus-visible': '.pill__close' })).toBe('hover → .pill; focus-visible → .pill__close');
    });

    it('groups a pseudo-class with an earlier one that shares its target, not with its neighbour', () => {
        expect(pseudoSignature({ hover: '.a', active: '.b', focus: '.a' })).toBe('hover + focus → .a; active → .b');
    });

    it('reads true as the component and a selector list joined with a comma', () => {
        expect(pseudoSignature({ hover: true, focus: ['.a', '.b'] })).toBe('hover → the component; focus → .a, .b');
    });

    it('says an empty slot forces no state', () => {
        expect(pseudoSignature({})).toBe('forces no state');
    });

    it('ignores a slot without a target, like the marker', () => {
        expect(pseudoSignature({ hover: ' ', focus: [] })).toBe('forces no state');
        expect(pseudoSignature({ hover: ' ', active: '.btn' })).toBe('active → .btn');
    });
});

describe('fitLabel', () => {
    it('labels the fit count', () => {
        expect(fitLabel(2, 5)).toBe('fits 2 of 5');
        expect(fitLabel(0, 3)).toBe('fits 0 of 3');
    });
});

function matrixOf(config: Partial<ShowcaseConfig>): OverviewMatrix {
    return buildOverviewMatrix({ title: 'Button', ...config });
}

const THREE_BY_THREE = matrixOf({
    variants: [{ name: 'A' }, { name: 'B' }, { name: 'C' }],
    states: [
        { name: 'S0', pseudo: { hover: true } },
        { name: 'S1', pseudo: { hover: true } },
        { name: 'S2', pseudo: { hover: true } }
    ]
});

describe('columnFit', () => {
    it('counts the variants a state fits, and which ones it was asked of', () => {
        const matrix = matrixOf({
            variants: [{ name: 'A' }, { name: 'B', states: false }, { name: 'C' }],
            states: [{ name: 'S0', pseudo: { hover: true } }]
        });

        expect(columnFit(results([[0, 0, FITS]]), matrix, 0)).toEqual({ fits: 1, eligible: 2, complete: false });
        expect(
            columnFit(
                results([
                    [0, 0, FITS],
                    [2, 0, MISFIT]
                ]),
                matrix,
                0
            )
        ).toEqual({ fits: 1, eligible: 2, complete: true });
    });

    it('does not count the results of another column', () => {
        expect(columnFit(results([[0, 1, FITS]]), THREE_BY_THREE, 0)).toEqual({ fits: 0, eligible: 3, complete: false });
    });
});

describe('statesFittingNowhere', () => {
    it('reports a state only once its column is complete and fits nowhere', () => {
        const all = results([
            // S0 and S2: every variant answered, none fits.
            [0, 0, MISFIT],
            [1, 0, MISFIT],
            [2, 0, MISFIT],
            [0, 2, MISFIT],
            [1, 2, MISFIT],
            [2, 2, MISFIT],
            // S1: fits nowhere so far, but the last variant has not answered.
            [0, 1, MISFIT],
            [1, 1, MISFIT]
        ]);

        expect(statesFittingNowhere(all, THREE_BY_THREE)).toEqual([0, 2]);
    });

    it('does not report a state that fits somewhere', () => {
        const some = results([
            [0, 0, MISFIT],
            [1, 0, FITS],
            [2, 0, MISFIT]
        ]);

        expect(statesFittingNowhere(some, THREE_BY_THREE)).toEqual([]);
    });

    it('leaves an opted-out variant out of the column it is not part of', () => {
        const matrix = matrixOf({
            variants: [{ name: 'A' }, { name: 'Ghost', states: false }],
            states: [{ name: 'S0', pseudo: { hover: true } }]
        });

        expect(statesFittingNowhere(results([[0, 0, MISFIT]]), matrix)).toEqual([0]);
    });

    it('reports nothing for a state no variant was asked about', () => {
        const matrix = matrixOf({
            variants: [{ name: 'Ghost', states: false }],
            states: [{ name: 'S0', pseudo: { hover: true } }]
        });

        expect(statesFittingNowhere(new Map(), matrix)).toEqual([]);
    });

    it('reports nothing before any cell has answered', () => {
        expect(statesFittingNowhere(new Map(), THREE_BY_THREE)).toEqual([]);
    });

    it('leaves out a state that forces nothing, which has no selector to check', () => {
        const matrix = matrixOf({
            variants: [{ name: 'A' }, { name: 'B' }],
            states: [
                { name: 'Gap', pseudo: {} },
                { name: 'Blank', pseudo: { hover: '' } },
                { name: 'Typo', pseudo: { hover: '.btm' } }
            ]
        });
        const nothing: StateFit = { fits: false, reason: 'forces no state' };
        const all = results([
            [0, 0, nothing],
            [1, 0, nothing],
            [0, 1, nothing],
            [1, 1, nothing],
            [0, 2, MISFIT],
            [1, 2, MISFIT]
        ]);

        expect(statesFittingNowhere(all, matrix)).toEqual([2]);
    });
});

describe('columnHeaders', () => {
    const matrix = matrixOf({
        variants: [{ name: 'A' }, { name: 'B' }],
        states: [
            { name: 'Hover', pseudo: { hover: '.btn' } },
            { name: 'Typo', pseudo: { hover: '.btm' } },
            { name: 'Gap', pseudo: {} }
        ]
    });

    it('counts the fits of each state column and leaves the Default column without a count', () => {
        const headers = columnHeaders(results([[0, 0, FITS]]), matrix);

        expect(headers.map(({ column, fit, fitsNowhere }) => [column.title, fit, fitsNowhere])).toEqual([
            ['Default', null, false],
            ['Hover', 'fits 1 of 2', false],
            ['Typo', 'fits 0 of 2', false],
            ['Gap', 'fits 0 of 2', false]
        ]);
    });

    it('marks a column that every cell has answered and none fits, unless its state forces nothing', () => {
        const nothing: StateFit = { fits: false, reason: 'forces no state' };
        const headers = columnHeaders(
            results([
                [0, 0, FITS],
                [1, 0, MISFIT],
                [0, 1, MISFIT],
                [1, 1, MISFIT],
                [0, 2, nothing],
                [1, 2, nothing]
            ]),
            matrix
        );

        expect(headers.map(({ column, fitsNowhere }) => [column.title, fitsNowhere])).toEqual([
            ['Default', false],
            ['Hover', false],
            ['Typo', true],
            ['Gap', false]
        ]);
    });
});
