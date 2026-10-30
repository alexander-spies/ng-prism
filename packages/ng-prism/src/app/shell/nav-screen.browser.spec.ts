import { renderCanvasChain } from './__fixtures__/capture-dom.js';

describe('full-screen navigation', () => {
    afterEach(() => {
        document.head.querySelectorAll('style').forEach((el) => el.remove());
        document.body.innerHTML = '';
    });

    /** The sidebar inside is a <nav> already; a second one around it would announce the landmark twice. */
    it('should wrap the sidebar without a landmark of its own', () => {
        const dom = renderCanvasChain('light');
        const screen = dom.host.querySelector('.prism-nav-screen');

        expect(screen).not.toBeNull();
        expect(screen?.tagName).toBe('DIV');
        expect(screen?.hasAttribute('role')).toBe(false);
    });
});
