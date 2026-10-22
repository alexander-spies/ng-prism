import { statusFor, thresholdFromTarget } from '@ng-prism/core/plugin';
import type { CoverageSummary, CoverageThresholds } from './coverage.types.js';

/**
 * Threshold derivation lives in its own module so both sides can reach it:
 * `coverage-plugin.ts` carries the build-time hook that reads the istanbul
 * summary from disk and must never be reachable from a browser bundle, while
 * the header badge and the navigation marker run in the browser.
 *
 * Same motive as `thresholds.ts` in `plugin-visual-regression`.
 */
/** The single number the badge compares against: the mean of the four metrics. */
export function avgThreshold(thresholds: CoverageThresholds): number {
    return Math.round((thresholds.lines + thresholds.branches + thresholds.functions + thresholds.statements) / 4);
}

export function deriveCoverageSummary(score: number, thresholds: CoverageThresholds): CoverageSummary {
    const avg = avgThreshold(thresholds);
    const variant: CoverageSummary['variant'] = statusFor(score, thresholdFromTarget(avg));

    return { variant, label: `Coverage: ${score}% (target ${avg}%)` };
}
