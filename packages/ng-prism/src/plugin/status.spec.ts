import { STATUS_DANGER_RATIO, statusFor, thresholdFromTarget, worstTone } from './status.js';

describe('statusFor', () => {
    describe('higher is better', () => {
        const target80 = thresholdFromTarget(80);

        it.each([
            [80, 'ok'],
            [100, 'ok'],
            [79, 'warn'],
            [60, 'warn'],
            [59.9, 'danger'],
            [0, 'danger']
        ] as const)('grades %s against a target of 80 as %s', (value, tone) => {
            expect(statusFor(value, target80)).toBe(tone);
        });
    });

    describe('lower is better', () => {
        const budget = { ok: 20, warn: 50, direction: 'lower' } as const;

        it.each([
            [8.4, 'ok'],
            [20, 'ok'],
            [20.1, 'warn'],
            [50, 'warn'],
            [50.1, 'danger']
        ] as const)('grades %s against 20/50 as %s', (value, tone) => {
            expect(statusFor(value, budget)).toBe(tone);
        });
    });
});

describe('thresholdFromTarget', () => {
    it('puts warn at the danger ratio of the target', () => {
        expect(STATUS_DANGER_RATIO).toBe(0.75);
        expect(thresholdFromTarget(80)).toEqual({ ok: 80, warn: 60 });
    });
});

describe('worstTone', () => {
    it('returns the most severe tone', () => {
        expect(worstTone(['ok', 'danger', 'warn'])).toBe('danger');
        expect(worstTone(['ok', 'warn'])).toBe('warn');
    });

    it('has nothing to report for an empty list', () => {
        expect(worstTone([])).toBe('ok');
    });
});
