import { HEAD_COMPACT_BELOW, isCompactHead } from './head-compact.js';

describe('isCompactHead', () => {
    it('should turn compact below 600px', () => {
        expect(HEAD_COMPACT_BELOW).toBe(600);
        expect(isCompactHead(599)).toBe(true);
    });

    it('should keep the full row from 600px', () => {
        expect(isCompactHead(600)).toBe(false);
    });
});
