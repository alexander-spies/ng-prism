import { statusFor, type StatusTone, thresholdFromTarget } from '@ng-prism/core/plugin';

/** One coverage metric graded against its own threshold, by the rule every key figure uses. */
export function coverageMetricTone(pct: number, threshold: number): StatusTone {
    return statusFor(pct, thresholdFromTarget(threshold));
}
