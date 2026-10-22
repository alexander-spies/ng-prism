import { formatSide, getBoxModel } from './box-model-utils.js';

function makeElement(rectOverrides: Partial<DOMRect> = {}, styleOverrides: Record<string, string> = {}): Element {
    const el = {
        getBoundingClientRect: () => ({
            top: 100,
            left: 50,
            width: 200,
            height: 80,
            right: 250,
            bottom: 180,
            x: 50,
            y: 100,
            toJSON: () => ({}),
            ...rectOverrides
        })
    } as unknown as Element;

    const defaultStyle: Record<string, string> = {
        'padding-top': '8px',
        'padding-right': '16px',
        'padding-bottom': '8px',
        'padding-left': '16px',
        'border-top-width': '1px',
        'border-right-width': '1px',
        'border-bottom-width': '1px',
        'border-left-width': '1px',
        'margin-top': '4px',
        'margin-right': '0px',
        'margin-bottom': '4px',
        'margin-left': '0px',
        ...styleOverrides
    };

    jest.spyOn(window, 'getComputedStyle').mockReturnValue({
        getPropertyValue: (prop: string) => defaultStyle[prop] ?? '0px'
    } as unknown as CSSStyleDeclaration);

    return el;
}

describe('getBoxModel', () => {
    afterEach(() => jest.restoreAllMocks());

    it('returns the content DOMRect from getBoundingClientRect', () => {
        const el = makeElement({ width: 200, height: 80 });
        const result = getBoxModel(el);

        expect(result.content.width).toBe(200);
        expect(result.content.height).toBe(80);
    });

    it('parses padding from computed style', () => {
        const el = makeElement(
            {},
            {
                'padding-top': '10px',
                'padding-right': '20px',
                'padding-bottom': '10px',
                'padding-left': '20px'
            }
        );
        const result = getBoxModel(el);

        expect(result.padding).toEqual({ top: 10, right: 20, bottom: 10, left: 20 });
    });

    it('parses border-width from computed style', () => {
        const el = makeElement(
            {},
            {
                'border-top-width': '2px',
                'border-right-width': '4px',
                'border-bottom-width': '2px',
                'border-left-width': '4px'
            }
        );
        const result = getBoxModel(el);

        expect(result.border).toEqual({ top: 2, right: 4, bottom: 2, left: 4 });
    });

    it('parses margin from computed style', () => {
        const el = makeElement(
            {},
            {
                'margin-top': '16px',
                'margin-right': '8px',
                'margin-bottom': '16px',
                'margin-left': '8px'
            }
        );
        const result = getBoxModel(el);

        expect(result.margin).toEqual({ top: 16, right: 8, bottom: 16, left: 8 });
    });

    it('returns 0 for properties not set', () => {
        const el = makeElement(
            {},
            {
                'padding-top': '0px',
                'padding-right': '0px',
                'padding-bottom': '0px',
                'padding-left': '0px',
                'border-top-width': '0px',
                'border-right-width': '0px',
                'border-bottom-width': '0px',
                'border-left-width': '0px',
                'margin-top': '0px',
                'margin-right': '0px',
                'margin-bottom': '0px',
                'margin-left': '0px'
            }
        );
        const result = getBoxModel(el);

        expect(result.padding).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
        expect(result.border).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
        expect(result.margin).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
    });

    it('returns the element reference', () => {
        const el = makeElement();
        const result = getBoxModel(el);

        expect(result.element).toBe(el);
    });
});

/**
 * A side that is zero reads "0": a dash looked like "unknown" next to sides
 * that carry a number.
 */
describe('formatSide', () => {
    it.each([
        [0, '0'],
        [12.5, '12.5'],
        [4, '4'],
        [0.333, '0.33']
    ])('formats %s as %s', (value, text) => {
        expect(formatSide(value)).toBe(text);
    });
});
