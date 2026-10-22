import { DEFAULT_VRT_THRESHOLDS, vrtLibraryTone } from './thresholds.js';

describe('vrtLibraryTone', () => {
    it.each([
        [100, 'ok'],
        [96, 'warn'],
        [75, 'warn'],
        [74, 'danger']
    ] as const)('grades %s%% unchanged against the default target as %s', (score, tone) => {
        expect(vrtLibraryTone(score, DEFAULT_VRT_THRESHOLDS)).toBe(tone);
    });

    it('follows a configured target', () => {
        expect(vrtLibraryTone(92, { score: 90 })).toBe('ok');
    });
});
