import type { A11yShowcaseMeta } from '../../../decorator/showcase.types.js';
/** What the live audit reads from a component's `meta.a11y`; one shape with the decorator's. */
export type A11yCoreConfig = A11yShowcaseMeta;

export interface A11yScoreResult {
    score: number;
    violations: number;
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
    passes: number;
    incomplete: number;
}

export interface A11yThresholds {
    /** Minimum acceptable avg score (0-100). Default: 80 */
    score: number;
    /** Maximum allowed critical violations across the library. Default: 0 */
    critical: number;
    /** Maximum allowed serious violations across the library. Default: 0 */
    serious: number;
    /** Maximum allowed moderate violations across the library. Default: A11Y_UNLIMITED. */
    moderate: number;
}

/** A11y-Report shape produced by the build-time audit (or any user script). */
export interface A11yReport {
    /** Aggregate library-wide score data (avg + sum of violations). */
    total: A11yScoreResult & {
        auditedComponents: number;
        auditedVariants: number;
    };
    /** Optional per-component breakdown (className -> score). Used for tooltips/drilldown. */
    components?: Record<string, A11yScoreResult>;
    /** Timestamp the report was generated. */
    generatedAt?: string;
}

/** Shape stored under `manifest.meta.a11y` once the report is merged in. */
export interface A11yManifestMeta {
    total: A11yReport['total'];
    thresholds: A11yThresholds;
}

/** What the build adds under `showcaseConfig.meta.a11y` from the report, next to the component's own {@link A11yCoreConfig}. */
export interface A11yComponentMeta {
    found: boolean;
    score: A11yScoreResult;
    /**
     * Pre-derived headline, written by the build step. Optional because a report
     * written before this field existed simply has none, and the marker is then
     * left out rather than guessed at.
     */
    summary?: { variant: 'ok' | 'warn' | 'danger'; label: string };
}

export interface NgPrismA11yConfig {
    /**
     * What the a11y figures are graded against: the header pill, the navigation
     * marker, the gauge in the component head and the score card. While `gate` is
     * not set, the build also fails on them, as before 22.7.0.
     */
    thresholds?: Partial<A11yThresholds>;
    /**
     * The build gate: `prism-build` fails when the report's total breaks these
     * limits (missing ones are the defaults, not `thresholds`). Left out, the
     * build gates with `thresholds`. `false` never fails a build, so the
     * styleguide grades and shows a report that breaks the limits, for example
     * when CI gates on its own. The dev server only warns either way. Since 22.7.0.
     */
    gate?: Partial<A11yThresholds> | false;
    /** Path to the a11y report JSON, relative to the workspace root. Default: 'a11y-report.json'. */
    reportPath?: string;
}

export interface FocusableElement {
    element: Element;
    index: number;
    role: string;
    name: string;
    nameSource: string;
    states: string[];
    tabindex: number | null;
}

export interface A11yNode {
    role: string;
    name: string | null;
    nameSource: string | null;
    description: string | null;
    states: Record<string, string | boolean>;
    children: A11yNode[];
    hidden: boolean;
    element: Element;
}

export interface SrAnnouncement {
    index: number;
    text: string;
    name: string;
    role: string;
    states: string[];
    element: Element;
}
