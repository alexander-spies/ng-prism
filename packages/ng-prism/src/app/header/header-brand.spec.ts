import { headerBrand } from './header-brand.js';

describe('headerBrand', () => {
    it('shows the ng-prism wordmark without a configured title', () => {
        expect(headerBrand({})).toEqual({ kind: 'wordmark', logoUrl: null });
    });

    it('keeps a configured logo next to the wordmark when no title is set', () => {
        expect(headerBrand({ logo: { dark: 'd.svg' } })).toEqual({ kind: 'wordmark', logoUrl: 'd.svg' });
    });

    /**
     * Since 22.7 the header is a navy band in both themes, so the logo drawn for
     * dark backgrounds is the one that fits it whatever the app theme is.
     */
    it('shows a configured title with the dark logo first', () => {
        expect(headerBrand({ title: 'sg-ui', logo: { light: 'l.svg', dark: 'd.svg' } })).toEqual({ kind: 'title', title: 'sg-ui', logoUrl: 'd.svg' });
    });

    it('falls back to the light logo, then to none', () => {
        expect(headerBrand({ title: 'sg-ui', logo: { light: 'l.svg' } })).toEqual({ kind: 'title', title: 'sg-ui', logoUrl: 'l.svg' });
        expect(headerBrand({ title: 'sg-ui' })).toEqual({ kind: 'title', title: 'sg-ui', logoUrl: null });
    });
});
