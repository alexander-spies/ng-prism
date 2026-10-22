import { barGeometry } from './metric-bar.js';

describe('barGeometry', () => {
    it('places fill and threshold tick as percentages', () => {
        expect(barGeometry(0.86, 0.8)).toEqual({ width: '86%', tick: '80%' });
    });

    it('clamps an overshooting value and omits a missing tick', () => {
        expect(barGeometry(1.4)).toEqual({ width: '100%', tick: null });
    });

    it('clamps below zero and a threshold past the end', () => {
        expect(barGeometry(-0.2, 1.2)).toEqual({ width: '0%', tick: '100%' });
    });

    it('keeps fractional percentages', () => {
        expect(barGeometry(0.4736)).toEqual({ width: '47.36%', tick: null });
    });
});
