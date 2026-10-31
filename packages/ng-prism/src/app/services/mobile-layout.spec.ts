import { MOBILE_MEDIA_QUERY, MOBILE_PANEL, mobilePanelBounds, mobilePanelHeight, startsCollapsed } from './mobile-layout.js';

describe('mobile layout', () => {
    it('should keep at least 96px of canvas next to the panel', () => {
        expect(MOBILE_PANEL.minCanvas).toBe(96);
    });

    it('should switch below 900px and on short touch screens', () => {
        expect(MOBILE_MEDIA_QUERY).toBe('(max-width: 900px), (pointer: coarse) and (max-height: 500px)');
    });

    describe('mobilePanelBounds', () => {
        it('should allow the panel up to three quarters of the height', () => {
            expect(mobilePanelBounds(844)).toEqual({ min: 160, max: 633 });
        });

        /** The minimum gives way rather than the bounds crossing. */
        it('should lower the minimum to the maximum on a very short screen', () => {
            expect(mobilePanelBounds(180)).toEqual({ min: 135, max: 135 });
        });

        /** 844px tall, 136px of header, head and rail: 708px for canvas and panel, of which the canvas keeps 96. */
        it('should leave the canvas its minimum of the space it shares with the panel', () => {
            expect(mobilePanelBounds(844, 708)).toEqual({ min: 160, max: 612 });
        });

        it('should let the canvas minimum win over the panel minimum on a phone held sideways', () => {
            expect(mobilePanelBounds(390, 254)).toEqual({ min: 158, max: 158 });
        });
    });

    describe('mobilePanelHeight', () => {
        it('should start at 45 percent of the height', () => {
            expect(mobilePanelHeight(844, null)).toBe(380);
        });

        it('should keep a height the reader chose', () => {
            expect(mobilePanelHeight(844, 500)).toBe(500);
        });

        /** Before the shell has measured the space, only the share of the viewport bounds it. */
        it('should clamp a chosen height to the bounds of the current height', () => {
            expect(mobilePanelHeight(390, 500)).toBe(292);
        });

        /** A phone turned to landscape after a drag to the top: the canvas keeps its 96px. */
        it('should clamp a chosen height so the canvas keeps its minimum', () => {
            expect(mobilePanelHeight(390, 500, 254)).toBe(158);
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
