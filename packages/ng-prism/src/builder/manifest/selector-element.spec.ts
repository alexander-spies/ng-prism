import { firstSelectorAttribute, selectorElement } from './selector-element.js';

describe('selectorElement', () => {
    it('takes the part that fits the host tag', () => {
        expect(selectorElement('input[libInput], textarea[libInput]', 'textarea')).toEqual({ tag: 'textarea', attributes: 'libInput' });
    });

    it('uses the element of the first part without a tag', () => {
        expect(selectorElement('input[libInput]')).toEqual({ tag: 'input', attributes: 'libInput' });
        expect(selectorElement('[libTooltip]')).toEqual({ tag: 'div', attributes: 'libTooltip' });
    });

    it('keeps attribute values and classes, drops :not()', () => {
        expect(selectorElement('button[libBtn][type=submit].primary:not(a)', 'button')).toEqual({
            tag: 'button',
            attributes: 'libBtn type="submit" class="primary"'
        });
    });

    it('returns null when no part fits the tag', () => {
        expect(selectorElement('input[libInput]', 'div')).toBeNull();
    });

    it('lets a part without an element fit any tag', () => {
        expect(selectorElement('[libTooltip]', 'section')).toEqual({ tag: 'section', attributes: 'libTooltip' });
    });

    it('joins several classes with a space', () => {
        expect(selectorElement('span.a.b', 'span')).toEqual({ tag: 'span', attributes: 'class="a b"' });
    });

    it('returns null for a selector Angular cannot parse', () => {
        expect(selectorElement('input:not(a:not(b))', 'input')).toBeNull();
    });
});

describe('firstSelectorAttribute', () => {
    it('takes the first attribute of the first part', () => {
        expect(firstSelectorAttribute('input[libInput][other], textarea[libInput]')).toBe('libInput');
        expect(firstSelectorAttribute('button[type=submit]')).toBe('type="submit"');
    });

    it('is empty when the selector has no attribute and no class', () => {
        expect(firstSelectorAttribute('lib-input')).toBe('');
        expect(firstSelectorAttribute('input:not(a:not(b))')).toBe('');
    });
});
