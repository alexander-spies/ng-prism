import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BRAND_IMAGE_DATA_URI, BRAND_IMAGE_HEIGHT, BRAND_IMAGE_SVG, BRAND_IMAGE_WIDTH } from './brand-image.js';

const SYMBOL_SVG = readFileSync(join(__dirname, '../../../../../docs/assets/brand/ng-prism-symbol.svg'), 'utf8');

// The brand kit's symbol is the source; the app draws a copy of it.
describe('brand image', () => {
    it('is a verbatim copy of docs/assets/brand/ng-prism-symbol.svg', () => {
        expect(BRAND_IMAGE_SVG).toBe(SYMBOL_SVG);
    });

    it('takes its size from the symbol', () => {
        expect(SYMBOL_SVG).toContain(`width="${BRAND_IMAGE_WIDTH}" height="${BRAND_IMAGE_HEIGHT}"`);
    });

    it('is the symbol as an SVG data URI', () => {
        expect(BRAND_IMAGE_DATA_URI.startsWith('data:image/svg+xml,')).toBe(true);
        expect(decodeURIComponent(BRAND_IMAGE_DATA_URI.slice('data:image/svg+xml,'.length))).toBe(SYMBOL_SVG);
    });
});
