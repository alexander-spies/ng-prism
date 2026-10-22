import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BRAND_MARK_FACETS, BRAND_MARK_GRADIENTS, BRAND_MARK_SQUARE_VIEWBOX, BRAND_MARK_VIEWBOX } from './brand-mark.js';

const SYMBOL_SVG = readFileSync(join(__dirname, '../../../../../docs/assets/brand/ng-prism-symbol.svg'), 'utf8');

// The brand kit's symbol is the source; the app draws a copy of its geometry.
describe('brand mark', () => {
    it('draws the facets of docs/assets/brand/ng-prism-symbol.svg in their order and colours', () => {
        const kit = [...SYMBOL_SVG.matchAll(/<path fill="([^"]+)" d="([^"]+)"\/>/g)].map(([, fill, d]) => ({ fill, d }));
        const drawn = BRAND_MARK_FACETS.map((f) => ({ fill: f.gradient ? 'url(#a)' : f.colour, d: f.d }));

        expect(drawn).toEqual(kit);
    });

    it('takes the gradient of the kit symbol', () => {
        const [, attributes, stops] = /<linearGradient id="a" ([^>]*)>(.*?)<\/linearGradient>/.exec(SYMBOL_SVG)!;
        const attr = (name: string) => Number(new RegExp(`${name}="([^"]+)"`).exec(attributes)![1]);
        const [face] = BRAND_MARK_GRADIENTS;

        expect(BRAND_MARK_GRADIENTS).toHaveLength(1);
        expect(attributes).toContain('gradientUnits="userSpaceOnUse"');
        expect([face.x1, face.y1, face.x2, face.y2]).toEqual([attr('x1'), attr('y1'), attr('x2'), attr('y2')]);
        expect(face.stops).toEqual([...stops.matchAll(/<stop offset="([^"]+)" stop-color="([^"]+)"\/>/g)].map(([, offset, colour]) => [offset, colour]));
    });

    it('keeps the square box centred on the trimmed one', () => {
        const [x, y, w, h] = BRAND_MARK_VIEWBOX.split(' ').map(Number);
        const [sx, sy, sw, sh] = BRAND_MARK_SQUARE_VIEWBOX.split(' ').map(Number);

        expect([sx, sw, sh]).toEqual([x, w, w]);
        expect(sy + sh / 2).toBe(y + h / 2);
    });
});
