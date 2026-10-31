import { deriveA11ySummary } from './a11y-summary.js';
import { DEFAULT_A11Y_THRESHOLDS } from './a11y-thresholds.js';
import type { A11yScoreResult } from './a11y.types.js';

const result = (patch: Partial<A11yScoreResult>): A11yScoreResult => ({
    score: 100,
    violations: 0,
    critical: 0,
    serious: 0,
    moderate: 0,
    minor: 0,
    passes: 10,
    incomplete: 0,
    ...patch
});

describe('deriveA11ySummary', () => {
    it('is ok at or above the score threshold without blocking violations', () => {
        expect(deriveA11ySummary(result({ score: 80 }), DEFAULT_A11Y_THRESHOLDS).variant).toBe('ok');
    });

    it('warns below the score threshold', () => {
        expect(deriveA11ySummary(result({ score: 79 }), DEFAULT_A11Y_THRESHOLDS).variant).toBe('warn');
    });

    /** The 0.75 step every surface shares since 22.7; before, only the header knew it. */
    it('is critical below 0.75 of the score threshold', () => {
        expect(deriveA11ySummary(result({ score: 59 }), DEFAULT_A11Y_THRESHOLDS).variant).toBe('danger');
        expect(deriveA11ySummary(result({ score: 60 }), DEFAULT_A11Y_THRESHOLDS).variant).toBe('warn');
    });

    it('is critical for a serious violation even with a high score', () => {
        expect(deriveA11ySummary(result({ score: 95, serious: 1 }), DEFAULT_A11Y_THRESHOLDS).variant).toBe('danger');
    });

    it('warns when moderate violations pass their threshold', () => {
        expect(deriveA11ySummary(result({ score: 95, moderate: 3 }), { ...DEFAULT_A11Y_THRESHOLDS, moderate: 2 }).variant).toBe('warn');
    });
});
