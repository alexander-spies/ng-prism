import type { Type } from '@angular/core';
import type { ComponentComposition, RuntimeComponent } from '../../plugin/plugin.types.js';
import { COMPOSITION_SUBJECT_SLOT } from '../../shared/composition.js';
import { activeCase, renderSignature, renderTypeFor, sameRender } from './composition.js';

const SLOT = COMPOSITION_SUBJECT_SLOT;

class Frame {}
class Wrapper {}

function comp(variants: string[], options: { type?: Type<unknown>; composition?: ComponentComposition; wrapper?: Type<unknown> } = {}): RuntimeComponent {
    return {
        type: options.type ?? Frame,
        ...(options.wrapper && { composition: options.wrapper }),
        meta: {
            className: 'Frame',
            filePath: '/frame.ts',
            showcaseConfig: { title: 'Frame', variants: variants.map((name) => ({ name })) },
            inputs: [],
            outputs: [],
            componentMeta: { selector: 'lib-frame', standalone: true, isDirective: false },
            ...(options.composition && { composition: options.composition })
        }
    };
}

const CASES = [
    { template: `<lib-frame${SLOT}><b>Bold</b></lib-frame>`, unbound: [] },
    { template: `<section><lib-frame${SLOT} /></section>`, unbound: [{ name: 'label', reason: 'template' as const }] }
];

/** Variants 0 and 2 composed, variant 1 renders the class as before. */
const mixed = comp(['Bold', 'Plain', 'Section'], { wrapper: Wrapper, composition: { variantCases: [0, -1, 1], cases: CASES } });
const plain = comp(['A', 'B']);

describe('activeCase', () => {
    it('finds the case of a composed variant', () => {
        expect(activeCase(mixed, 0)).toBe(CASES[0]);
        expect(activeCase(mixed, 2)).toBe(CASES[1]);
    });

    it('has none for a variant without a composition, an index past the variants, or a showcase without compositions', () => {
        expect(activeCase(mixed, 1)).toBeNull();
        expect(activeCase(mixed, 3)).toBeNull();
        expect(activeCase(plain, 0)).toBeNull();
    });

    it('has none when the manifest carries no wrapper to render the case in', () => {
        const unwrapped = comp(['Bold'], { composition: { variantCases: [0], cases: CASES } });

        expect(activeCase(unwrapped, 0)).toBeNull();
    });

    it('takes the implicit variant 0 of a showcase without variants', () => {
        const single = comp([], { type: Wrapper, wrapper: Wrapper, composition: { variantCases: [0], cases: [CASES[0]] } });

        expect(activeCase(single, 0)).toBe(CASES[0]);
    });
});

describe('renderTypeFor', () => {
    it('picks the wrapper for a composed variant and the class otherwise', () => {
        expect(renderTypeFor(mixed, 0)).toBe(Wrapper);
        expect(renderTypeFor(mixed, 1)).toBe(Frame); // variantCases[1] === -1
    });

    it('picks the class of a showcase without compositions', () => {
        expect(renderTypeFor(plain, 1)).toBe(Frame);
    });
});

describe('renderSignature / sameRender', () => {
    it('treats two composed variants as different renders', () => {
        expect(sameRender(renderSignature(mixed, 0, undefined), renderSignature(mixed, 2, undefined))).toBe(false);
    });

    it('treats the same composed variant as the same render', () => {
        expect(sameRender(renderSignature(mixed, 2, undefined), renderSignature(mixed, 2, undefined))).toBe(true);
    });

    it('treats two plain variants with equal content as the same render', () => {
        expect(sameRender(renderSignature(plain, 0, 'x'), renderSignature(plain, 1, 'x'))).toBe(true);
    });

    it('treats two plain variants with different content as different renders', () => {
        expect(sameRender(renderSignature(plain, 0, 'x'), renderSignature(plain, 1, 'y'))).toBe(false);
    });

    it('re-renders when switching from composed to plain', () => {
        expect(sameRender(renderSignature(mixed, 0, undefined), renderSignature(mixed, 1, undefined))).toBe(false);
    });

    it('re-renders when nothing is rendered yet', () => {
        expect(sameRender(null, renderSignature(plain, 0, undefined))).toBe(false);
    });
});
