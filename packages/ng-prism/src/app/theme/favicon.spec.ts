import { FAVICON_SVG_DATA_URI } from './favicon.js';

describe('favicon', () => {
    const svg = decodeURIComponent(FAVICON_SVG_DATA_URI.replace('data:image/svg+xml,', ''));

    it('is an SVG data URI', () => {
        expect(FAVICON_SVG_DATA_URI.startsWith('data:image/svg+xml,')).toBe(true);
        expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    });

    it('draws the six facets of the brand mark with its gradient', () => {
        expect(svg.match(/<path /g)).toHaveLength(6);
        expect(svg.match(/<linearGradient /g)).toHaveLength(1);
        expect(svg).toContain('fill="url(#fav-face)"');
    });

    it('is square, so the browser does not letterbox it', () => {
        const [, , w, h] = /viewBox="(-?[\d.]+) (-?[\d.]+) ([\d.]+) ([\d.]+)"/.exec(svg)!.slice(1).map(Number);

        expect(w).toBe(h);
    });
});
