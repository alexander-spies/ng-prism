import { readFileSync, statSync } from 'node:fs';
import { isVrtStatus, type VrtReport, type VrtTotals, type VrtVariantResult } from './visual-regression.types.js';

const cache = new Map<string, { mtime: number; data: VrtReport }>();

/** Statuses already reported to the console, so a build warns once, not per component. */
const warnedStatuses = new Set<string>();

/**
 * Reads and parses the report, memoised on the file's mtime so a watch-mode
 * rebuild picks up a fresh run without re-parsing on every scanned component.
 */
function loadReport(reportPath: string): VrtReport | null {
    try {
        const mtime = statSync(reportPath).mtimeMs;
        const cached = cache.get(reportPath);

        if (cached && cached.mtime === mtime) return cached.data;

        const parsed = JSON.parse(readFileSync(reportPath, 'utf-8')) as VrtReport;

        cache.set(reportPath, { mtime, data: parsed });
        return parsed;
    } catch {
        return null;
    }
}

/**
 * All recorded results for one component, ordered by variant index, then by
 * state: a variant's own entry first, then its states in source order.
 *
 * Components are matched on `className`, which the report and the scanner
 * share, so the coverage plugin's path-matching heuristics are not needed.
 *
 * The report's shape is validated. It comes from a third-party runner, and this
 * runs inside `onComponentScanned`, where a throw fails the whole styleguide
 * build. A malformed report degrades to "no results", like a missing one.
 *
 * `status` is validated too. The counts, the summary bar and the panel's three
 * groups are all keyed by it, and the groups only know the five documented
 * values. An entry with any other status would be counted by `summarize` but
 * shown in no group. Such entries are dropped here, with a warning.
 */
export function readVariantsForComponent(reportPath: string, className: string): VrtVariantResult[] {
    const entries: unknown = loadReport(reportPath)?.byVariant;

    if (!Array.isArray(entries)) return [];

    return entries
        .filter((entry): entry is VrtVariantResult => isRecord(entry) && entry['className'] === className)
        .filter((entry) => {
            if (isVrtStatus(entry.status)) return true;
            warnUnknownStatus(reportPath, entry);
            return false;
        })
        .sort(compareResults);
}

function warnUnknownStatus(reportPath: string, entry: VrtVariantResult): void {
    const status = String(entry.status);

    if (warnedStatuses.has(status)) return;
    warnedStatuses.add(status);
    console.warn(
        `ng-prism/plugin-visual-regression: ${reportPath} reports an unknown ` +
            `status ${JSON.stringify(entry.status)} (first seen on ` +
            `${entry.className}). Those variants are left out of the panel.`
    );
}

export function readTotals(reportPath: string): VrtTotals | null {
    const total: unknown = loadReport(reportPath)?.total;

    return isRecord(total) ? (total as unknown as VrtTotals) : null;
}

export function clearReportCache(): void {
    cache.clear();
    warnedStatuses.clear();
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Missing or non-numeric indices sort first rather than poisoning the sort. */
function variantIndexOf(variant: VrtVariantResult): number {
    return typeof variant.variantIndex === 'number' ? variant.variantIndex : 0;
}

/**
 * Variant first, then state. An entry without a state comes before every state
 * of its variant, whatever the indices. A non-numeric `stateIndex` counts as no
 * state, which is also how `rowKey` reads it, so a malformed entry keeps the
 * variant's key instead of splitting off.
 */
function compareResults(a: VrtVariantResult, b: VrtVariantResult): number {
    const byVariant = variantIndexOf(a) - variantIndexOf(b);

    if (byVariant !== 0) return byVariant;

    const stateA = typeof a.stateIndex === 'number' ? a.stateIndex : null;
    const stateB = typeof b.stateIndex === 'number' ? b.stateIndex : null;

    if (stateA === stateB) return 0;
    if (stateA === null) return -1;
    if (stateB === null) return 1;
    return stateA - stateB;
}
