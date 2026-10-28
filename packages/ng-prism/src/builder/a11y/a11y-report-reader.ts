import { readFileSync, statSync } from 'node:fs';
import { deriveA11ySummary } from '../../app/panels/a11y/a11y-summary.js';
import { resolveA11yThresholds } from '../../app/panels/a11y/a11y-thresholds.js';
import type { A11yComponentMeta, A11yManifestMeta, A11yReport, A11yThresholds, NgPrismA11yConfig } from '../../app/panels/a11y/a11y.types.js';

// Re-exported so the builder side keeps one import surface for the a11y
// report. The derivation itself lives in `app/` because the panel tab grades
// the live audit with it and cannot reach into `builder/`.
export { deriveA11ySummary };

export const DEFAULT_A11Y_REPORT_PATH = 'a11y-report.json';

const cache = new Map<string, { mtime: number; data: A11yReport }>();

export function loadA11yReport(reportPath: string): A11yReport | null {
    try {
        const mtime = statSync(reportPath).mtimeMs;
        const cached = cache.get(reportPath);

        if (cached && cached.mtime === mtime) return cached.data;

        const raw = readFileSync(reportPath, 'utf-8');
        const parsed = JSON.parse(raw) as A11yReport;

        cache.set(reportPath, { mtime, data: parsed });
        return parsed;
    } catch {
        return null;
    }
}

export function readA11yMeta(reportPath: string, thresholdsInput?: Partial<A11yThresholds>): A11yManifestMeta | null {
    const report = loadA11yReport(reportPath);

    if (!report?.total) return null;

    return {
        total: report.total,
        thresholds: resolveA11yThresholds(thresholdsInput)
    };
}

/**
 * Every component's entry, from a single read of the report.
 *
 * The plural form exists because {@link readA11yForComponent} re-enters
 * {@link loadA11yReport}, which `statSync`s the file even on a cache hit.
 * Calling it once per scanned component turns a 300-component library into 300
 * redundant syscalls per build, and a watch-mode rebuild repeats them all. So
 * the pipeline reads the report once and looks components up in the result.
 */
export function readA11yForComponents(reportPath: string, thresholds: A11yThresholds): Map<string, A11yComponentMeta> {
    const components = loadA11yReport(reportPath)?.components;
    const byClassName = new Map<string, A11yComponentMeta>();

    if (!components) return byClassName;

    for (const [className, score] of Object.entries(components)) {
        if (!score) continue;
        byClassName.set(className, {
            found: true,
            score,
            summary: deriveA11ySummary(score, thresholds)
        });
    }
    return byClassName;
}

/** The per-component entry of the report, or null when there is none. */
export function readA11yForComponent(reportPath: string, className: string, thresholds: A11yThresholds): A11yComponentMeta | null {
    const score = loadA11yReport(reportPath)?.components?.[className];

    if (!score) return null;

    return { found: true, score, summary: deriveA11ySummary(score, thresholds) };
}

/** The limits the build gates on: `gate` filled from the defaults, `thresholds` while `gate` is not set, `null` for `gate: false`. */
export function resolveA11yGate(config: NgPrismA11yConfig | undefined): A11yThresholds | null {
    if (config?.gate === false) return null;
    return resolveA11yThresholds(config?.gate ?? config?.thresholds);
}

export interface ThresholdViolation {
    metric: 'score' | 'critical' | 'serious' | 'moderate';
    actual: number;
    threshold: number;
}

export function checkA11yThresholds(meta: A11yManifestMeta): ThresholdViolation[] {
    const violations: ThresholdViolation[] = [];
    const t = meta.thresholds;
    const total = meta.total;

    if (total.score < t.score) {
        violations.push({
            metric: 'score',
            actual: total.score,
            threshold: t.score
        });
    }
    if (total.critical > t.critical) {
        violations.push({
            metric: 'critical',
            actual: total.critical,
            threshold: t.critical
        });
    }
    if (total.serious > t.serious) {
        violations.push({
            metric: 'serious',
            actual: total.serious,
            threshold: t.serious
        });
    }
    if (total.moderate > t.moderate) {
        violations.push({
            metric: 'moderate',
            actual: total.moderate,
            threshold: t.moderate
        });
    }
    return violations;
}

export function clearA11yReportCache(): void {
    cache.clear();
}
