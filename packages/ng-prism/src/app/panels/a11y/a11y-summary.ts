import { statusFor, thresholdFromTarget } from '../../../plugin/status.js';
import type { A11yComponentMeta, A11yScoreResult, A11yThresholds } from './a11y.types.js';

/**
 * A component's standing, derived with the same precedence
 * `checkA11yThresholds` uses library-wide.
 *
 * Browser-safe, even though the build step is its main caller: the derivation is written down once and read from both sides. The
 * build-time hook stores the result in the component's meta for the navigation
 * marker, and the panel tab grades the *live* audit with the very same rule.
 * The two look at different numbers (the report is a snapshot, the audit is
 * running now), but they must never grade the same number differently, which
 * is what a second hardcoded scale next to this one would guarantee.
 */
export function deriveA11ySummary(score: A11yScoreResult, thresholds: A11yThresholds): NonNullable<A11yComponentMeta['summary']> {
    if (score.critical > thresholds.critical || score.serious > thresholds.serious) {
        const parts: string[] = [];

        if (score.critical > 0) parts.push(`${score.critical} critical`);
        if (score.serious > 0) parts.push(`${score.serious} serious`);
        // Only reachable with a negative configured threshold: the branch fires
        // on `0 > threshold` with both counts still at zero, and `parts` stays
        // empty. Fall back to the score-based label rather than ship "A11y: ".
        const label = parts.length > 0 ? `A11y: ${parts.join(', ')}` : `A11y score ${score.score}`;

        return { variant: 'danger', label };
    }

    // The score is graded like every other key figure: ok from the target,
    // warn down to 0.75 of it, critical below that.
    const scoreTone = statusFor(score.score, thresholdFromTarget(thresholds.score));

    if (scoreTone === 'danger') {
        return { variant: 'danger', label: `A11y score ${score.score}` };
    }

    if (score.moderate > thresholds.moderate || scoreTone === 'warn') {
        return { variant: 'warn', label: `A11y score ${score.score}` };
    }

    return { variant: 'ok', label: `A11y score ${score.score}` };
}
