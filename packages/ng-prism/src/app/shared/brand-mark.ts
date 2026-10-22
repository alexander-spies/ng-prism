/**
 * The ng-prism symbol from the 22.7 brand kit, as data.
 *
 * Kept as data rather than an SVG file because two consumers draw it with
 * different gradient ids: the logo component renders one instance per place it
 * appears (header and sidebar footer at the same time), and SVG gradient ids are
 * document-global; the favicon serialises it once into a data URI. The geometry
 * is copied verbatim from `ng-prism-symbol-small.svg` (512 × 512 canvas) and must
 * not be edited: the brand guide forbids reshaping the mark.
 */
export interface BrandMarkGradient {
    id: string;
    x2: number;
    y2: number;
    stops: ReadonlyArray<readonly [offset: string, colour: string]>;
}

export interface BrandMarkFacet {
    points: string;
    /** A gradient id from {@link BRAND_MARK_GRADIENTS}, or a solid colour. */
    gradient?: string;
    colour?: string;
    opacity?: number;
}

export const BRAND_MARK_GRADIENTS: readonly BrandMarkGradient[] = [
    {
        id: 'leftMain',
        x2: 1,
        y2: 1,
        stops: [
            ['0', '#8EF8FF'],
            ['.42', '#00D8F7'],
            ['1', '#0877FF']
        ]
    },
    {
        id: 'leftShade',
        x2: 1,
        y2: 1,
        stops: [
            ['0', '#19DFFF'],
            ['1', '#0755E8']
        ]
    },
    {
        id: 'rightMain',
        x2: 1,
        y2: 1,
        stops: [
            ['0', '#174EFF'],
            ['.55', '#332BFF'],
            ['1', '#E20BEF']
        ]
    },
    {
        id: 'innerLeft',
        x2: 1,
        y2: 1,
        stops: [
            ['0', '#4CF4FF'],
            ['1', '#006BFF']
        ]
    },
    {
        id: 'innerRight',
        x2: 1,
        y2: 1,
        stops: [
            ['0', '#A7B8FF'],
            ['1', '#6637F5']
        ]
    },
    {
        id: 'innerBase',
        x2: 1,
        y2: 0,
        stops: [
            ['0', '#086AFF'],
            ['1', '#7B37FF']
        ]
    }
];

export const BRAND_MARK_FACETS: readonly BrandMarkFacet[] = [
    { points: '256,42 153,112 86,330 198,216', gradient: 'leftMain' },
    { points: '256,42 198,216 153,112', colour: '#A0F8FF', opacity: 0.78 },
    { points: '153,112 198,216 86,330', gradient: 'leftShade' },
    { points: '278,42 359,112 426,330 322,216', gradient: 'rightMain' },
    { points: '278,42 322,216 359,112', colour: '#2C38FF', opacity: 0.8 },
    { points: '359,112 322,216 426,330', colour: '#D20BEF', opacity: 0.92 },
    { points: '256,216 174,304 338,304', gradient: 'innerBase' },
    { points: '256,216 256,268 174,304', gradient: 'innerLeft' },
    { points: '256,216 338,304 256,268', gradient: 'innerRight' },
    { points: '174,304 256,268 338,304', colour: '#143BFF', opacity: 0.55 }
];

/** The mark's bounding box on the kit canvas, trimmed to the facets. */
export const BRAND_MARK_VIEWBOX = '80 38 352 296';

/** The same box padded to a square, for icons the browser would otherwise letterbox. */
export const BRAND_MARK_SQUARE_VIEWBOX = '80 10 352 352';

/** The mark as a standalone SVG document, with every gradient id prefixed. */
export function brandMarkSvg(idPrefix: string, viewBox: string): string {
    const gradients = BRAND_MARK_GRADIENTS.map(
        (g) =>
            `<linearGradient id="${idPrefix}${g.id}" x1="0" y1="0" x2="${g.x2}" y2="${g.y2}">` +
            g.stops.map(([offset, colour]) => `<stop offset="${offset}" stop-color="${colour}"/>`).join('') +
            '</linearGradient>'
    ).join('');
    const facets = BRAND_MARK_FACETS.map((f) => {
        const fill = f.gradient ? `url(#${idPrefix}${f.gradient})` : f.colour;
        const opacity = f.opacity === undefined ? '' : ` opacity="${f.opacity}"`;

        return `<polygon points="${f.points}" fill="${fill}"${opacity}/>`;
    }).join('');

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><defs>${gradients}</defs>${facets}</svg>`;
}
