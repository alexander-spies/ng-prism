import type { VrtStatus, VrtVariantResult } from './visual-regression.types.js';
import { defaultExpandedGroups, formatPercent, groupRows, rowKey, rowLabel, statSummary, summarize, summarySegments } from './vrt-summarize.js';

function variant(status: VrtStatus, diffRatio?: number): VrtVariantResult {
    return {
        className: 'ButtonComponent',
        variantIndex: 0,
        status,
        ...(diffRatio === undefined ? {} : { diffRatio })
    };
}

describe('summarize', () => {
    it('counts every status', () => {
        const summary = summarize([
            variant('unchanged', 0),
            variant('unchanged', 0),
            variant('changed', 0.1),
            variant('size-mismatch'),
            variant('new'),
            variant('excluded')
        ]);

        expect(summary.counts).toEqual({
            unchanged: 2,
            changed: 1,
            'size-mismatch': 1,
            new: 1,
            excluded: 1
        });
        expect(summary.total).toBe(6);
    });

    it('reports the worst diff among compared variants', () => {
        const summary = summarize([variant('unchanged', 0), variant('changed', 0.1026), variant('changed', 0.004)]);

        expect(summary.maxDiffRatio).toBeCloseTo(0.1026);
        expect(summary.compared).toBe(3);
    });

    it('has no diff figure when nothing could be compared', () => {
        const summary = summarize([variant('new'), variant('excluded')]);

        expect(summary.maxDiffRatio).toBeNull();
        expect(summary.compared).toBe(0);
    });

    it('does not let a size-mismatch invent a diff of zero', () => {
        // Dimensions changed, so no pixel comparison happened. Counting it as a
        // compared 0% would claim a clean result the runner never produced.
        const summary = summarize([variant('size-mismatch')]);

        expect(summary.maxDiffRatio).toBeNull();
        expect(summary.compared).toBe(0);
    });

    it('handles an empty list', () => {
        const summary = summarize([]);

        expect(summary.total).toBe(0);
        expect(summary.maxDiffRatio).toBeNull();
        expect(summary.counts.unchanged).toBe(0);
    });

    it('leaves a status outside the union out of the figures entirely', () => {
        // It used to count towards `total` while `groupRows` rendered no row for
        // it: present in the headline, absent from the list. The reader rejects
        // such an entry before it gets here, and the two agree either way.
        const rogue = { ...variant('unchanged'), status: 'wat' as VrtStatus };

        expect(() => summarize([rogue])).not.toThrow();

        const summary = summarize([rogue]);

        expect(summary.total).toBe(0);
        expect(groupRows([rogue]).flatMap((group) => group.rows)).toEqual([]);
    });

    it('does not let a prototype member pass for a status', () => {
        // `counts` is an object literal, so the old `status in counts` check was
        // true for `toString` and incremented a key that is not a count.
        const rogue = { ...variant('unchanged'), status: 'toString' as VrtStatus };
        const summary = summarize([rogue]);

        expect(summary.total).toBe(0);
        expect(Object.values(summary.counts).every(Number.isInteger)).toBe(true);
    });

    it('ignores a diff ratio on a variant nothing compared', () => {
        // A runner writing `diffRatio: 1` on a resized capture means "completely
        // different", not "100% of the pixels were measured and moved". Folding
        // it in put `VRT 100.00%` in the component head for an uncompared variant.
        const summary = summarize([
            { ...variant('size-mismatch'), diffRatio: 1 },
            { ...variant('new'), diffRatio: 1 }
        ]);

        expect(summary.compared).toBe(0);
        expect(summary.maxDiffRatio).toBeNull();
    });
});

describe('summarySegments', () => {
    it('omits a status that did not occur', () => {
        // A bar has no shape to keep: a zero-count slice is zero pixels wide, so
        // carrying it would only add an invisible entry and a misleading legend.
        const segments = summarySegments(summarize([variant('new')]));

        expect(segments.map((s) => s.key)).toEqual(['new']);
    });

    it('leads with the bad news', () => {
        const segments = summarySegments(summarize([variant('unchanged', 0), variant('changed', 0.5), variant('size-mismatch'), variant('excluded')]));

        expect(segments.map((s) => s.key)).toEqual(['changed', 'size-mismatch', 'unchanged', 'excluded']);
    });

    it('carries the raw count so the bar can weight itself', () => {
        const segments = summarySegments(summarize([variant('unchanged', 0), variant('unchanged', 0), variant('unchanged', 0), variant('changed', 0.5)]));

        expect(segments.find((s) => s.key === 'unchanged')?.count).toBe(3);
        expect(segments.find((s) => s.key === 'changed')?.count).toBe(1);
    });

    it('gives every segment its status tone and label', () => {
        const segments = summarySegments(summarize([variant('size-mismatch')]));

        expect(segments[0]).toEqual({
            key: 'size-mismatch',
            label: 'Resized',
            count: 1,
            tone: 'warn'
        });
    });

    it('survives an empty variant list', () => {
        expect(summarySegments(summarize([]))).toEqual([]);
    });
});

describe('formatPercent', () => {
    it('shows a clean zero', () => {
        expect(formatPercent(0)).toBe('0%');
    });

    it('never rounds a real diff down to zero', () => {
        expect(formatPercent(0.00001)).toBe('<0.01%');
    });

    it('keeps two decimals', () => {
        expect(formatPercent(0.1026)).toBe('10.26%');
    });
});

function row(status: VrtStatus, name: string) {
    return { status, name };
}

describe('groupRows', () => {
    it('collects everything a reviewer has to act on into one group', () => {
        const groups = groupRows([row('unchanged', 'a'), row('changed', 'b'), row('new', 'c'), row('size-mismatch', 'd')]);

        expect(groups.map((g) => g.key)).toEqual(['review', 'unchanged']);
        // `new` belongs here because a variant with no baseline still needs a
        // human decision (accepting one), even though it is not a failure.
        expect(groups[0].rows.map((r) => r.name)).toEqual(['b', 'd', 'c']);
        expect(groups[0].count).toBe(3);
    });

    it('orders the review group worst news first', () => {
        const groups = groupRows([row('new', 'n'), row('size-mismatch', 's'), row('changed', 'c')]);

        expect(groups[0].rows.map((r) => r.status)).toEqual(['changed', 'size-mismatch', 'new']);
    });

    it('keeps the declared order of variants sharing a status', () => {
        const groups = groupRows([row('changed', 'first'), row('changed', 'second'), row('changed', 'third')]);

        expect(groups[0].rows.map((r) => r.name)).toEqual(['first', 'second', 'third']);
    });

    it('omits a group nothing fell into', () => {
        const groups = groupRows([row('unchanged', 'a')]);

        expect(groups.map((g) => g.key)).toEqual(['unchanged']);
    });

    it('separates excluded from unchanged', () => {
        // Both are "not your problem right now", but they are not the same claim:
        // one was compared and matched, the other was never captured.
        const groups = groupRows([row('excluded', 'x'), row('unchanged', 'u')]);

        expect(groups.map((g) => g.key)).toEqual(['unchanged', 'excluded']);
    });

    it('never lets the review group be collapsed away', () => {
        const groups = groupRows([row('changed', 'c'), row('unchanged', 'u')]);

        expect(groups.find((g) => g.key === 'review')?.collapsible).toBe(false);
        expect(groups.find((g) => g.key === 'unchanged')?.collapsible).toBe(true);
    });

    it('survives an empty list', () => {
        expect(groupRows([])).toEqual([]);
    });
});

describe('defaultExpandedGroups', () => {
    it('keeps the quiet groups shut while something needs review', () => {
        const groups = groupRows([row('changed', 'c'), row('unchanged', 'u')]);

        expect(defaultExpandedGroups(groups)).toEqual([]);
    });

    it('opens the first group when nothing needs review', () => {
        // Otherwise a clean run renders as two collapsed headers and reads as if
        // the panel failed to load.
        const groups = groupRows([row('unchanged', 'u'), row('excluded', 'x')]);

        expect(defaultExpandedGroups(groups)).toEqual(['unchanged']);
    });

    it('opens whatever the first group happens to be', () => {
        const groups = groupRows([row('excluded', 'x')]);

        expect(defaultExpandedGroups(groups)).toEqual(['excluded']);
    });

    it('has nothing to open when there are no groups', () => {
        expect(defaultExpandedGroups([])).toEqual([]);
    });
});

describe('statSummary', () => {
    it('is green only when nothing regressed', () => {
        const stat = statSummary(summarize([variant('unchanged', 0)]));

        expect(stat).toEqual({
            value: '0%',
            variant: 'ok',
            label: 'Visual regression: 0% max diff'
        });
    });

    it('goes red on a change, however small', () => {
        // The plugin's own default threshold is a perfect score, so any regression
        // is worth seeing. Magnitude belongs in the value, not in the colour.
        const stat = statSummary(summarize([variant('unchanged', 0), variant('changed', 0.0004)]));

        expect(stat.variant).toBe('danger');
        expect(stat.value).toBe('0.04%');
        expect(stat.label).toBe('Visual regression: 0.04% max diff');
    });

    it('warns for a variant that could not be compared', () => {
        expect(statSummary(summarize([variant('size-mismatch')])).variant).toBe('warn');
        expect(statSummary(summarize([variant('new')])).variant).toBe('warn');
    });

    it('has no figure to show when nothing was compared', () => {
        expect(statSummary(summarize([variant('new')])).value).toBe('—');
    });

    it('names the real reason a warn fires instead of repeating the missing value', () => {
        // `value` is '—' here because nothing was compared, so a label built from it
        // would read "Visual regression: — max diff": amber, naming nothing.
        const newOnly = statSummary(summarize([variant('new')]));

        expect(newOnly.label).toBe('Visual regression: 1 new baseline');

        const resizedOnly = statSummary(summarize([variant('size-mismatch')]));

        expect(resizedOnly.label).toBe('Visual regression: 1 resized');
    });

    it('names every unmeasurable reason, worst first, when several fire', () => {
        const stat = statSummary(summarize([variant('size-mismatch'), variant('new'), variant('new')]));

        expect(stat.label).toBe('Visual regression: 1 resized, 2 new baselines');
    });

    it('lets a real change outrank an unmeasurable one', () => {
        const stat = statSummary(summarize([variant('new'), variant('changed', 0.5)]));

        expect(stat.variant).toBe('danger');
        expect(stat.label).toBe('Visual regression: 50.00% max diff');
    });
});

describe('rowKey', () => {
    it('keys a variant row by class and variant index', () => {
        expect(rowKey({ className: 'C', variantIndex: 2, status: 'unchanged' })).toBe('C:2');
    });

    it('keys a state row apart from its variant row', () => {
        const variantRow = { className: 'C', variantIndex: 2, status: 'unchanged' } as const;
        const stateRow = { ...variantRow, stateIndex: 1 };

        expect(rowKey(stateRow)).toBe('C:2:1');
        expect(rowKey(stateRow)).not.toBe(rowKey(variantRow));
    });

    it('keeps the first state apart from the variant', () => {
        // State index 0 is a real state. A truthiness check would drop it and
        // collide with the variant's own row.
        expect(rowKey({ className: 'C', variantIndex: 2, stateIndex: 0, status: 'unchanged' })).toBe('C:2:0');
    });
});

describe('rowLabel', () => {
    it('labels a variant row with its name', () => {
        expect(rowLabel({ className: 'C', variantName: 'Outlined', variantIndex: 2, status: 'unchanged' })).toBe('Outlined');
    });

    it('falls back to the title, then to the variant index', () => {
        expect(rowLabel({ className: 'C', title: 'Button', variantIndex: 2, status: 'unchanged' })).toBe('Button');
        expect(rowLabel({ className: 'C', variantIndex: 2, status: 'unchanged' })).toBe('Variant 2');
    });

    it('labels a state row', () => {
        const label = rowLabel({ className: 'C', variantName: 'Outlined', variantIndex: 2, stateIndex: 0, stateName: 'Hover', status: 'unchanged' });

        expect(label).toBe('Outlined × Hover');
    });

    it('falls back to the state index without a name', () => {
        expect(rowLabel({ className: 'C', variantName: 'Outlined', variantIndex: 2, stateIndex: 1, status: 'unchanged' })).toBe('Outlined × State 1');
    });
});
