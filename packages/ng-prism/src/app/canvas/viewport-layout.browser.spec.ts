import type { CanvasLayout } from '../../shared/canvas-layout.type.js';
import { renderCanvasChain } from '../shell/__fixtures__/capture-dom.js';

/**
 * How `.demo-wrap` lays its child out with Viewport width on, per `canvasLayout`.
 *
 * The failure is geometric: with a viewport width set, a `stretch` composition rendered its subject as wide as the
 * subject's content (a form field at 192px in a 390px viewport) and a horizontal divider at 0px, because the centring
 * grid shrank the grid item, which for a composition is ng-prism's wrapper. jsdom has no layout engine, so the widths
 * cannot be asserted here. What decides them can: the display and the alignment the shipped stylesheet gives the
 * shipped template. Measured once in Chromium against these stylesheets (test-lib, Form Field "Full width" and
 * Divider "Horizontal"): at 390, 100 and 1024px the subject is as wide as the viewport, and a `fit` showcase stays
 * centred at its own width.
 */
function constrained(layout: CanvasLayout): CSSStyleDeclaration {
    const { demoWrap } = renderCanvasChain('dots');

    // Both are bindings, so the markup carries no value: set what the renderer binds with a viewport width on.
    demoWrap.setAttribute('data-canvas-layout', layout);
    demoWrap.setAttribute('data-viewport', '');
    return getComputedStyle(demoWrap);
}

describe('viewport width and canvasLayout', () => {
    afterEach(() => {
        document.documentElement.removeAttribute('data-prism-capture');
        document.head.querySelectorAll('style').forEach((el) => el.remove());
        document.body.innerHTML = '';
    });

    it('should lay a stretch showcase out as at rest, a block its child fills', () => {
        const style = constrained('stretch');

        expect(style.display).toBe('block');
        expect(style.getPropertyValue('justify-items')).not.toContain('center');
    });

    it('should keep centring a fit showcase at its own width', () => {
        const style = constrained('fit');

        expect(style.display).toBe('grid');
        expect(style.getPropertyValue('justify-items')).toBe('safe center');
    });
});
