import { coverageMetricTone } from './coverage-metric-tone.js';

describe('coverageMetricTone', () => {
    it.each([
        [47.36, 80, 'danger'],
        [68, 80, 'warn'],
        [86, 80, 'ok'],
        [80, 80, 'ok']
    ] as const)('grades %s%% against a target of %s as %s', (pct, threshold, tone) => {
        expect(coverageMetricTone(pct, threshold)).toBe(tone);
    });
});
