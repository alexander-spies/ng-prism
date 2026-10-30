import { MOBILE_MEDIA_QUERY, mobilePanelBounds, mobilePanelHeight, startsCollapsed } from './mobile-layout.js';

describe('mobile layout', () => {
    it('should switch below 900px and on short touch screens', () => {
        expect(MOBILE_MEDIA_QUERY).toBe('(max-width: 900px), (pointer: coarse) and (max-height: 500px)');
    });

    describe('mobilePanelBounds', () => {
        it('should allow the panel up to three quarters of the height', () => {
            expect(mobilePanelBounds(844)).toEqual({ min: 160, max: 633 });
        });

        it('should never put the maximum below the minimum', () => {
            expect(mobilePanelBounds(180)).toEqual({ min: 160, max: 160 });
        });
    });

    describe('mobilePanelHeight', () => {
        it('should start at 45 percent of the height', () => {
            expect(mobilePanelHeight(844, null)).toBe(380);
        });

        it('should keep a height the reader chose', () => {
            expect(mobilePanelHeight(844, 500)).toBe(500);
        });

        /** A phone turned to landscape after a drag: the canvas must keep a quarter of the height. */
        it('should clamp a chosen height to the bounds of the current height', () => {
            expect(mobilePanelHeight(390, 500)).toBe(292);
        });

        it('should not go below the minimum', () => {
            expect(mobilePanelHeight(844, 40)).toBe(160);
        });
    });

    describe('startsCollapsed', () => {
        it('should fold the panel away below 500px of height', () => {
            expect(startsCollapsed(499)).toBe(true);
        });

        it('should leave it open from 500px', () => {
            expect(startsCollapsed(500)).toBe(false);
        });
    });
});
