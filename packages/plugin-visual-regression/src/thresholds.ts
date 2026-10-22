import { statusFor, type StatusTone, thresholdFromTarget } from '@ng-prism/core/plugin';
import type { VrtThresholds } from './visual-regression.types.js';

/**
 * Threshold resolution lives in its own module so both entry points can export
 * it. `visual-regression-plugin.ts` carries the build-time hooks that read the
 * report from disk and must never be reachable from a browser bundle, so
 * `index.browser.ts` cannot re-export anything through it. But the public type
 * surface is shared between the two, and a symbol the `.d.ts` promises has to
 * exist in whichever bundle the consumer actually loads.
 */

/**
 * Any regression is worth seeing, so the badge only stays green at a perfect
 * score. It degrades to warn, then danger, as the score falls.
 */
export const DEFAULT_VRT_THRESHOLDS: VrtThresholds = { score: 100 };

export function resolveVrtThresholds(input?: number | Partial<VrtThresholds>): VrtThresholds {
    if (input === undefined) return { ...DEFAULT_VRT_THRESHOLDS };
    if (typeof input === 'number') return { score: input };
    return { ...DEFAULT_VRT_THRESHOLDS, ...input };
}

/** The library-wide verdict: the share of unchanged variants against the configured target. */
export function vrtLibraryTone(score: number, thresholds: VrtThresholds): StatusTone {
    return statusFor(score, thresholdFromTarget(thresholds.score));
}
