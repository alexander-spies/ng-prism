import { perfStatus } from './perf-status.js';

describe('perfStatus', () => {
    it.each([
        [8.4, { tone: 'ok', label: 'OK' }],
        [21, { tone: 'warn', label: 'Warning' }],
        [50, { tone: 'warn', label: 'Warning' }],
        [51, { tone: 'danger', label: 'Critical' }]
    ] as const)('grades %s against a 20/50 budget as %o', (value, status) => {
        expect(perfStatus(value, 20, 50)).toEqual(status);
    });
});
