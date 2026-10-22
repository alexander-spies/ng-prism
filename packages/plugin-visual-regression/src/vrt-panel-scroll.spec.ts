/**
 * @jest-environment jsdom
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The panel's markup and stylesheet, read from the files the component points
 * at rather than from a rendered component: the panel declares `input()`, and
 * initializer-based APIs do not survive this workspace's JIT test compilation
 * (the specs go through SWC, so nothing runs the Angular compiler over them).
 */
const PANEL_TEMPLATE = join(__dirname, 'visual-regression-panel.component.html');
const PANEL_STYLES = join(__dirname, 'visual-regression-panel.component.css');

/**
 * The panel's own markup and stylesheet, mounted for real.
 *
 * `:host` has no element here, so it is rewritten to the wrapper the markup
 * actually hangs off. That is the only substitution, and it keeps the host's
 * declarations in the cascade where the test can read them.
 */
function mountPanel(): { host: HTMLElement } {
    const style = document.createElement('style');

    style.textContent = readFileSync(PANEL_STYLES, 'utf8').replace(/:host\b/g, '.vrt-host');
    document.head.appendChild(style);

    const host = document.createElement('div');

    host.className = 'vrt-host';
    // The template's outermost element is wrapped in `@if` blocks, which parse
    // as text around it; the elements themselves still nest correctly.
    host.innerHTML = readFileSync(PANEL_TEMPLATE, 'utf8');
    document.body.appendChild(host);
    return { host };
}

function scrolls(el: Element | null): boolean {
    if (!el) throw new Error('element not found');
    const overflow = getComputedStyle(el).overflow;

    return overflow === 'auto' || overflow === 'scroll';
}

describe('visual regression panel scrolling', () => {
    afterEach(() => {
        document.head.querySelectorAll('style').forEach((el) => el.remove());
        document.body.innerHTML = '';
    });

    /**
     * Regression: the panel used to be one scroll container, so scrolling the
     * variant list also scrolled the comparison out of view.
     *
     * Asserted on the rendered elements, not the CSS text, so it survives the
     * rules being rewritten and fails if the host scrolls again.
     */
    it('should give the list and the viewer a scroll container each, and not the host', () => {
        const { host } = mountPanel();

        expect(scrolls(host.querySelector('.vrt__list'))).toBe(true);
        expect(scrolls(host.querySelector('.vrt__viewer'))).toBe(true);
        expect(scrolls(host)).toBe(false);
    });

    /**
     * A grid or flex item defaults to `min-height: auto` and will not shrink
     * below its content. Without `min-height: 0` on every element of the chain,
     * the columns grow past the panel and push the overflow up to the host,
     * which brings the original bug back even with the `overflow` rules in
     * place.
     */
    it('should let every column shrink below its content', () => {
        const { host } = mountPanel();

        for (const selector of ['.vrt', '.vrt__aside', '.vrt__list', '.vrt__viewer']) {
            const el = host.querySelector(selector);

            if (!el) throw new Error(`${selector} not found`);
            // Paired with the selector so a failure names the link that broke; the
            // unit is open because jsdom reports a bare `0` where a browser says
            // `0px`, and an unset property comes back as the empty string either way.
            expect([selector, getComputedStyle(el).minHeight]).toEqual([selector, expect.stringMatching(/^0(px)?$/)]);
        }
    });

    /**
     * The segment bar is gone (F14): the status breakdown is the list
     * headings' tooltip, so it stays with the list column by construction.
     */
    it('should carry the status breakdown on the list headings instead of a bar', () => {
        const { host } = mountPanel();

        expect(host.querySelector('.vrt__summary')).toBeNull();
        const heading = host.querySelector('.vrt__aside .vrt__group');

        // The raw template is mounted, so the binding shows as its attribute.
        expect(heading?.getAttribute('[title]')).toBe('breakdown()');
    });
});
