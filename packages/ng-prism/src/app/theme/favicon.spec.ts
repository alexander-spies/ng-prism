import { BRAND_IMAGE_SVG } from '../shared/brand-image.js';
import { FAVICON_SVG_DATA_URI } from './favicon.js';

describe('favicon', () => {
    it('is the brand symbol as an SVG data URI', () => {
        expect(FAVICON_SVG_DATA_URI.startsWith('data:image/svg+xml,')).toBe(true);
        expect(decodeURIComponent(FAVICON_SVG_DATA_URI.replace('data:image/svg+xml,', ''))).toBe(BRAND_IMAGE_SVG);
    });
});
