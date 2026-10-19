import type { CanvasBg } from '@ng-prism/core/plugin';

/**
 * Outcome of comparing one rendered variant against its baseline.
 *
 * `new` and `excluded` are not failures. A variant with no
 * baseline has nothing to regress against, and an excluded one was never
 * captured. A runner that does not fail its build on either must not be
 * contradicted by the UI.
 *
 * `excluded` exists because some variants cannot be captured meaningfully: a
 * tooltip that only renders on hover would be screenshotted as its trigger. A
 * runner reports them instead of dropping them, so skipped variants stay
 * visible in the list.
 */
export const VRT_STATUSES = ['unchanged', 'changed', 'size-mismatch', 'new', 'excluded'] as const;

export type VrtStatus = (typeof VRT_STATUSES)[number];

/**
 * Whether a report wrote a status this plugin knows how to render.
 *
 * A `Set` rather than `value in someRecord`: every status-keyed table here is
 * an object literal, so `in` also answers true for `toString`, `constructor`
 * and the rest of `Object.prototype`, so a report saying `status: "toString"`
 * would be counted as a real status and then looked up to a function.
 */
const KNOWN_STATUSES: ReadonlySet<string> = new Set(VRT_STATUSES);

export function isVrtStatus(value: unknown): value is VrtStatus {
    return typeof value === 'string' && KNOWN_STATUSES.has(value);
}

export interface VrtVariantResult {
    className: string;
    title?: string;
    variantName?: string;
    variantIndex: number;
    /**
     * The component-level state this capture was taken in: the `?state=` value
     * a runner drove the app with, which is the position of the state in
     * `@Showcase({ states })`, in source order.
     *
     * Omit it for the variant on its own. A component with `states` is captured
     * once per variant and state, so a report can hold several entries with the
     * same `variantIndex`, told apart by this index. An entry without it behaves
     * exactly as before.
     */
    stateIndex?: number;
    /** The state's `name`. Optional, the panel falls back to `State <stateIndex>`. */
    stateName?: string;
    status: VrtStatus;
    width?: number;
    height?: number;
    diffPixels?: number;
    totalPixels?: number;
    /** Changed pixels as a fraction of the total, e.g. `0.5` for 50%. */
    diffRatio?: number;
    baselinePath?: string;
    /** The image captured on this run. Optional, the panel degrades without it. */
    currentPath?: string;
    diffPath?: string;
    /**
     * The canvas background this run captured on: `DiscoveryVariant.bg` from
     * `__PRISM_MANIFEST__`, which the runner already read to drive the app.
     *
     * Recording it means a stored baseline keeps track of which surface it was
     * captured on.
     */
    bg?: CanvasBg;
    /**
     * The background the *stored baseline* was captured on, when the runner
     * tracks it alongside the baseline image.
     *
     * Explains an otherwise unexplained 100% diff: a variant whose `bg` changed
     * is compared against a baseline on the old surface, so every pixel differs
     * although the component did not change. `bg` alone cannot show that
     * because it only describes the current run.
     */
    baselineBg?: CanvasBg;
    /** Why a variant was excluded. Runners are expected to justify each one. */
    reason?: string;
}

export interface VrtTotals {
    auditedVariants: number;
    auditedComponents: number;
    unchanged: number;
    changed: number;
    sizeMismatch: number;
    new: number;
    /** Optional. Older runners and runners without an exclusion list omit it. */
    excluded?: number;
    maxDiffRatio: number;
    /** Percent of comparable variants that are unchanged. */
    score: number;
}

/** The JSON document an external runner writes. */
export interface VrtReport {
    total: VrtTotals;
    byVariant: VrtVariantResult[];
}

export interface VrtThresholds {
    /** Minimum score before the header badge stops being green. */
    score: number;
}

export interface VisualRegressionPluginOptions {
    /** Path to the report JSON, relative to the workspace root. */
    reportPath?: string;
    /**
     * Prefix applied to the image paths recorded in the report so they resolve
     * against the served styleguide. No layout is assumed.
     */
    assetBaseUrl?: string;
    thresholds?: number | Partial<VrtThresholds>;
}

/** Shape stored under `showcaseConfig.meta.visualRegression`. */
/** A component's visual regression standing, as the component head shows it. */
export interface VrtStat {
    /** The worst diff among compared variants, or `—` when none was. */
    value: string;
    variant: 'ok' | 'warn' | 'danger';
    /**
     * Pre-derived headline, composed here at build time alongside `value`
     * and never at read time. `badge()` returns this verbatim, the same contract
     * a11y's and coverage's `summary.label` already follow, so the navigation
     * marker's tooltip can never disagree with what this plugin considers true.
     */
    label: string;
}

export interface VrtComponentMeta {
    found: boolean;
    variants: VrtVariantResult[];
    assetBaseUrl: string;
    /**
     * Pre-derived headline for the component head, written by the build-time
     * hook. Optional because a report written before this field existed (or a
     * browser-only plugin setup, which runs no build-time hooks) simply has
     * none, and the stat is then left out rather than guessed at.
     */
    summary?: VrtStat;
}

/** Shape stored under `manifest.meta.visualRegression`. */
export interface VrtManifestMeta {
    found: boolean;
    total: VrtTotals | null;
    thresholds: VrtThresholds;
}
