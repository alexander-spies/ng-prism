import { avgThreshold, deriveCoverageSummary } from './coverage-summary.js';
import type { CoverageThresholds } from './coverage.types.js';

const T: CoverageThresholds = {
    lines: 80,
    branches: 80,
    functions: 80,
    statements: 80
};

// Sums to 322, so avg = Math.round(80.5) = 81. That is an odd average, unlike T's
// even 80. That makes avg * 0.75 = 60.75, a fractional boundary that T can
// never exercise (80 * 0.75 = 60 is a whole number).
const ODD_T: CoverageThresholds = {
    lines: 80,
    branches: 80,
    functions: 81,
    statements: 81
};

describe('avgThreshold', () => {
    it('rounds the mean of the four metrics', () => {
        expect(avgThreshold(T)).toBe(80);
        expect(avgThreshold({ lines: 90, branches: 70, functions: 85, statements: 76 })).toBe(80);
    });

    it('rounds a fractional mean up to an odd average', () => {
        expect(avgThreshold(ODD_T)).toBe(81);
    });
});

describe('deriveCoverageSummary', () => {
    it('is ok exactly at the threshold', () => {
        expect(deriveCoverageSummary(80, T).variant).toBe('ok');
    });

    it('is warn just below the threshold', () => {
        expect(deriveCoverageSummary(79, T).variant).toBe('warn');
    });

    it('is warn exactly at three quarters of the threshold', () => {
        expect(deriveCoverageSummary(60, T).variant).toBe('warn');
    });

    it('is danger below three quarters', () => {
        expect(deriveCoverageSummary(59, T).variant).toBe('danger');
    });

    it('is warn exactly at a fractional three-quarters boundary', () => {
        expect(deriveCoverageSummary(61, ODD_T).variant).toBe('warn');
    });

    it('is danger just below a fractional three-quarters boundary', () => {
        expect(deriveCoverageSummary(60, ODD_T).variant).toBe('danger');
    });

    it('names the score and the target', () => {
        expect(deriveCoverageSummary(61, T).label).toBe('Coverage 61% · target 80%');
    });
});
