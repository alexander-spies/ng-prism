import { toneForStatus } from './badge.types.js';

describe('toneForStatus', () => {
    it.each([
        ['ok', 'success'],
        ['warn', 'warn'],
        ['danger', 'danger']
    ] as const)('maps %s to the %s badge tone', (status, tone) => {
        expect(toneForStatus(status)).toBe(tone);
    });
});
