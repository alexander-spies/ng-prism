import { COMPOSITION_SUBJECT_ATTR, COMPOSITION_SUBJECT_SLOT, PRISM_VARIANT_INPUT, SUBJECT_MARKER_ATTR } from './composition.js';

describe('composition constants', () => {
    // An invisible character: a change that swaps it for another, or drops it, would not show in a diff.
    it('uses the private-use character U+E000 as the subject slot', () => {
        expect(COMPOSITION_SUBJECT_SLOT).toBe('\uE000');
        expect(COMPOSITION_SUBJECT_SLOT).toHaveLength(1);
    });

    it('names the attributes and the input the generated code and the app agree on', () => {
        expect(COMPOSITION_SUBJECT_ATTR).toBe('data-prism-subject');
        expect(SUBJECT_MARKER_ATTR).toBe('prism-subject');
        expect(PRISM_VARIANT_INPUT).toBe('__prismVariant__');
    });
});
