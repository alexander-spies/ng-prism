import { isVrtStatus, type VrtStat, type VrtStatus, type VrtVariantResult } from './visual-regression.types.js';

/**
 * Colour role of a status, resolved to a theme token by the components.
 *
 * `new` is `neutral`, not `muted`: the report contract says a variant with no
 * baseline is not a failure, and grey reads as "ignored" next to a green
 * "unchanged".
 */
export type VrtTone = 'success' | 'danger' | 'warn' | 'neutral' | 'muted';

export const STATUS_LABEL: Record<VrtStatus, string> = {
    unchanged: 'Unchanged',
    changed: 'Changed',
    'size-mismatch': 'Resized',
    new: 'New',
    excluded: 'Excluded'
};

export const STATUS_TONE: Record<VrtStatus, VrtTone> = {
    unchanged: 'success',
    changed: 'danger',
    'size-mismatch': 'warn',
    new: 'neutral',
    excluded: 'muted'
};

/** The two statuses that mean a baseline and a capture were actually compared. */
const COMPARED_STATUSES: ReadonlySet<VrtStatus> = new Set<VrtStatus>(['unchanged', 'changed']);

/** Order the summary strip and any status list follow: worst news first. */
const STATUS_ORDER: readonly VrtStatus[] = ['changed', 'size-mismatch', 'unchanged', 'new', 'excluded'];

export interface VrtSummary {
    /**
     * Variants with a recognised status: the same set the groups render, so
     * the headline figure and the list cannot disagree about how many there are.
     */
    total: number;
    counts: Record<VrtStatus, number>;
    /** Variants a runner could actually measure against a baseline. */
    compared: number;
    /** Largest diff among compared variants; `null` when nothing was compared. */
    maxDiffRatio: number | null;
}

export interface VrtSegment {
    key: VrtStatus;
    label: string;
    /** Raw count. The bar weights its slices by this, so it needs no ratio. */
    count: number;
    tone: VrtTone;
}

/**
 * Identity of one row in the variant list.
 *
 * A component with `states` is captured once per variant and state, so
 * `className:variantIndex` alone would give the variant and each of its states
 * the same key. The state index is appended only when the entry has one, which
 * leaves the key of every entry without a state as it was.
 */
export function rowKey(result: VrtVariantResult): string {
    const base = `${result.className}:${result.variantIndex}`;

    return typeof result.stateIndex === 'number' ? `${base}:${result.stateIndex}` : base;
}

/**
 * What a row is called: the variant's name, with the state after it when the
 * entry is a capture in one (`Outlined × Hover`).
 *
 * The variant part falls back as before, to the title and then to
 * `Variant <index>`. A state without a name reads `State <index>`.
 */
export function rowLabel(result: VrtVariantResult): string {
    const variant = result.variantName ?? result.title ?? `Variant ${result.variantIndex}`;

    if (typeof result.stateIndex !== 'number') return variant;
    return `${variant} × ${result.stateName ?? `State ${result.stateIndex}`}`;
}

/** Counts and the worst diff, derived from the variants already in `meta`. */
export function summarize(variants: readonly VrtVariantResult[]): VrtSummary {
    const counts: Record<VrtStatus, number> = {
        unchanged: 0,
        changed: 0,
        'size-mismatch': 0,
        new: 0,
        excluded: 0
    };

    let total = 0;
    let compared = 0;
    let maxDiffRatio: number | null = null;

    for (const variant of variants) {
        // `isVrtStatus`, not `variant.status in counts`: `counts` is an object
        // literal, so `in` also answers true for `Object.prototype` members and a
        // report writing `status: "toString"` would increment a key that is not
        // one, turning the count into `NaN`. The reader rejects such an entry
        // before it reaches here; this keeps the function correct on its own.
        if (!isVrtStatus(variant.status)) continue;
        total++;
        counts[variant.status]++;

        // A ratio exists only where a baseline and a capture were compared.
        // `new` has nothing to measure against and `size-mismatch` could not be
        // measured, so neither contributes to the worst-diff figure. The status
        // is what decides that, not the mere presence of a number. A runner that
        // records `diffRatio: 1` on a resized variant (a natural way to write
        // "completely different") would otherwise push the component head to
        // "VRT 100.00%" for a variant nothing ever compared.
        if (!COMPARED_STATUSES.has(variant.status)) continue;
        if (typeof variant.diffRatio === 'number') {
            compared++;
            maxDiffRatio = Math.max(maxDiffRatio ?? 0, variant.diffRatio);
        }
    }

    return { total, counts, compared, maxDiffRatio };
}

/**
 * The slices of the composition bar, worst news first.
 *
 * Only statuses that occurred. A zero count would add an invisible segment and
 * a legend entry for a colour nothing on screen shows.
 *
 * Counts, not ratios: the bar divides itself with `flex-grow`, so it needs
 * weights, and an empty run gives an empty bar instead of a division by zero.
 */
export function summarySegments(summary: VrtSummary): VrtSegment[] {
    return STATUS_ORDER.filter((status) => summary.counts[status] > 0).map((status) => ({
        key: status,
        label: STATUS_LABEL[status],
        count: summary.counts[status],
        tone: STATUS_TONE[status]
    }));
}

/**
 * A ratio as the percentage a reviewer reads.
 *
 * Anything above zero keeps two decimals, because the panel has to tell
 * "0.00%" apart from "a few pixels moved". A diff
 * that rounds to zero is shown as `<0.01%`, never as `0%`.
 */
export function formatPercent(ratio: number): string {
    const pct = ratio * 100;

    if (pct === 0) return '0%';
    if (pct < 0.01) return '<0.01%';
    return `${pct.toFixed(2)}%`;
}

/** The three buckets the variant list is grouped into, in display order. */
export type VrtGroupKey = 'review' | 'unchanged' | 'excluded';

export interface VrtGroup<T> {
    key: VrtGroupKey;
    label: string;
    count: number;
    /**
     * Whether the group may be collapsed. `review` never can: it is the reason
     * the panel exists, and a list whose only interesting rows can be hidden
     * behind a disclosure triangle is a list that gets skimmed past.
     */
    collapsible: boolean;
    rows: T[];
}

const GROUP_OF: Record<VrtStatus, VrtGroupKey> = {
    changed: 'review',
    'size-mismatch': 'review',
    new: 'review',
    unchanged: 'unchanged',
    excluded: 'excluded'
};

/**
 * Whether a status lands in the `review` group.
 *
 * Exported so the panel tab's badge can count the same set {@link groupRows}
 * puts in the first group without building all three groups to find out. The
 * badge runs on every change-detection pass, the grouping does not.
 */
export function isReviewStatus(status: VrtStatus): boolean {
    return GROUP_OF[status] === 'review';
}

const GROUP_LABEL: Record<VrtGroupKey, string> = {
    review: 'Needs review',
    unchanged: 'Unchanged',
    excluded: 'Excluded'
};

const GROUP_ORDER: readonly VrtGroupKey[] = ['review', 'unchanged', 'excluded'];

/**
 * The variant list split into what needs a decision and what does not.
 *
 * `new` sits in `review` beside `changed`. A variant with no baseline is not a
 * failure (the row keeps its neutral tone), but someone has to accept a
 * baseline for it. `excluded` gets its own group instead of joining
 * `unchanged`, because "compared and matched" and "never captured" mean
 * different things to a reviewer checking coverage.
 *
 * Empty groups are dropped, as in the summary bar above the list.
 *
 * Generic over the row type: the panel groups its own view models, which
 * already carry the label and formatted diff, so they are not built twice.
 */
export function groupRows<T extends { status: VrtStatus }>(rows: readonly T[]): VrtGroup<T>[] {
    return GROUP_ORDER.map((key) => ({
        key,
        label: GROUP_LABEL[key],
        collapsible: key !== 'review',
        rows: STATUS_ORDER.filter((status) => GROUP_OF[status] === key).flatMap((status) => rows.filter((row) => row.status === status))
    }))
        .filter((group) => group.rows.length > 0)
        .map((group) => ({ ...group, count: group.rows.length }));
}

/**
 * Which groups start open.
 *
 * None while something needs review, so the unchanged variants do not compete
 * with the changed ones. Without a review group the first group opens,
 * because collapsed headers and no rows look like a panel that failed to load.
 */
export function defaultExpandedGroups<T>(groups: readonly VrtGroup<T>[]): VrtGroupKey[] {
    if (groups.some((group) => group.key === 'review')) return [];
    return groups.length ? [groups[0].key] : [];
}

/**
 * Names the reason a warn fires when nothing was actually compared.
 *
 * `value` is `'—'` in this case: a resized capture or a variant with no
 * baseline has nothing to measure a diff against, so a label built from
 * `value` would read "Visual regression: — max diff". This names the cause
 * instead, like the a11y danger label lists the severities that fired.
 */
function warnReason(counts: VrtSummary['counts']): string {
    const parts: string[] = [];

    if (counts['size-mismatch'] > 0) {
        parts.push(`${counts['size-mismatch']} resized`);
    }
    if (counts.new > 0) {
        parts.push(`${counts.new} new baseline${counts.new === 1 ? '' : 's'}`);
    }
    return parts.join(', ');
}

/**
 * The headline figure, colour and label for one component.
 *
 * The colour comes from the *statuses*, not the percentage:
 * {@link DEFAULT_VRT_THRESHOLDS} is only green at a perfect score, so an amber
 * "small" diff would contradict the header badge. The value carries the
 * magnitude. Amber is for variants that could not be measured (resized and
 * new).
 *
 * The label is composed here only: `badge()` in `panel-contributions.ts`
 * returns it verbatim, as a11y and coverage do with their `summary.label`.
 *
 * Computed at build time and stored in the component's meta, so the component
 * head reads primitives instead of reimplementing these status rules.
 */
export function statSummary(summary: VrtSummary): VrtStat {
    const { counts, maxDiffRatio } = summary;
    const value = maxDiffRatio === null ? '—' : formatPercent(maxDiffRatio);

    if (counts.changed > 0) {
        return {
            value,
            variant: 'danger',
            label: `Visual regression: ${value} max diff`
        };
    }

    if (counts['size-mismatch'] > 0 || counts.new > 0) {
        return {
            value,
            variant: 'warn',
            label: `Visual regression: ${warnReason(counts)}`
        };
    }

    return {
        value,
        variant: 'ok',
        label: `Visual regression: ${value} max diff`
    };
}
