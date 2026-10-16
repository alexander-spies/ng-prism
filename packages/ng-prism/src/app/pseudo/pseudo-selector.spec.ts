import { PSEUDO_STATES, type PseudoState } from '../../shared/pseudo-state.type.js';
import { pseudoStateClass, rewritePseudoSelector } from './pseudo-selector.js';

/** What `:state` is widened to. */
function widened(state: PseudoState, written = `:${state}`): string {
    return `:is(${written}, .prism-pseudo--${state})`;
}

describe('pseudoStateClass', () => {
    it('names one class per state', () => {
        expect(PSEUDO_STATES.map(pseudoStateClass)).toEqual([
            'prism-pseudo--hover',
            'prism-pseudo--active',
            'prism-pseudo--focus',
            'prism-pseudo--focus-visible',
            'prism-pseudo--focus-within'
        ]);
    });
});

describe('rewritePseudoSelector', () => {
    it('widens a forced pseudo-class to also match its class', () => {
        expect(rewritePseudoSelector('.btn:hover')).toBe(`.btn${widened('hover')}`);
    });

    it.each(PSEUDO_STATES)('widens :%s', (state) => {
        expect(rewritePseudoSelector(`.a:${state}`)).toBe(`.a${widened(state)}`);
    });

    it('reads the whole name, so :focus, :focus-visible and :focus-within stay apart', () => {
        expect(rewritePseudoSelector('.a:focus')).toBe(`.a${widened('focus')}`);
        expect(rewritePseudoSelector('.a:focus-visible')).toBe(`.a${widened('focus-visible')}`);
        expect(rewritePseudoSelector('.a:focus-within')).toBe(`.a${widened('focus-within')}`);
    });

    it('returns null when the selector forces nothing', () => {
        expect(rewritePseudoSelector('.a:disabled')).toBeNull();
        expect(rewritePseudoSelector('.a::before')).toBeNull();
        expect(rewritePseudoSelector('.a:first-child > .b')).toBeNull();
        expect(rewritePseudoSelector('.hovered')).toBeNull();
    });

    it('returns null for a selector it has widened before', () => {
        const once = rewritePseudoSelector('.a:hover:not(:focus)')!;

        expect(rewritePseudoSelector(once)).toBeNull();
    });

    it('matches the pseudo-class case-insensitively, like CSS does, and keeps it as written', () => {
        expect(rewritePseudoSelector('.a:HOVER')).toBe(`.a${widened('hover', ':HOVER')}`);
    });

    it('can stand alone or after a type or universal selector', () => {
        expect(rewritePseudoSelector(':focus-visible')).toBe(widened('focus-visible'));
        expect(rewritePseudoSelector('a:hover')).toBe(`a${widened('hover')}`);
        expect(rewritePseudoSelector('*:active')).toBe(`*${widened('active')}`);
    });

    describe('escapes', () => {
        it('leaves an escaped colon in a class name alone', () => {
            expect(rewritePseudoSelector('.md\\:hover')).toBeNull();
            expect(rewritePseudoSelector('.md\\:hover\\:bg-blue')).toBeNull();
        });

        it('still widens a real pseudo-class after an escaped one', () => {
            expect(rewritePseudoSelector('.md\\:hover:hover')).toBe(`.md\\:hover${widened('hover')}`);
        });

        it('treats the whitespace closing a hex escape as part of the escape', () => {
            // `\3a ` is an escaped colon. Its trailing space ends the escape and is no combinator.
            expect(rewritePseudoSelector('.md\\3a hover')).toBeNull();
            expect(rewritePseudoSelector('.md\\3a hover:focus')).toBe(`.md\\3a hover${widened('focus')}`);
        });
    });

    describe('attribute selectors and strings', () => {
        it('does not look into attribute values', () => {
            expect(rewritePseudoSelector('[title=":hover"]')).toBeNull();
            expect(rewritePseudoSelector("[data-state='a:focus']:focus")).toBe(`[data-state='a:focus']${widened('focus')}`);
        });

        it('passes the attributes of emulated encapsulation through', () => {
            expect(rewritePseudoSelector('.btn[_ngcontent-ng-c123]:focus-visible')).toBe(`.btn[_ngcontent-ng-c123]${widened('focus-visible')}`);
            expect(rewritePseudoSelector('[_nghost-ng-c1]:hover .x[_ngcontent-ng-c1]')).toBe(`[_nghost-ng-c1]${widened('hover')} .x[_ngcontent-ng-c1]`);
        });

        it('does not look into a quoted :lang() argument', () => {
            expect(rewritePseudoSelector(':lang("x:hover")')).toBeNull();
        });
    });

    describe('functional pseudo-classes', () => {
        it('widens the arguments of :is() and :where()', () => {
            expect(rewritePseudoSelector(':is(.a:hover, .b) .c')).toBe(`:is(.a${widened('hover')}, .b) .c`);
            expect(rewritePseudoSelector(':where(:focus-visible)')).toBe(`:where(${widened('focus-visible')})`);
        });

        it('widens inside :not(), so a forced element no longer counts as not being in the state', () => {
            expect(rewritePseudoSelector('.a:not(:focus-visible)')).toBe(`.a:not(${widened('focus-visible')})`);
            expect(rewritePseudoSelector('.row:not(:hover) .actions')).toBe(`.row:not(${widened('hover')}) .actions`);
        });

        it('widens inside :has()', () => {
            expect(rewritePseudoSelector('.x:has(.y:focus-visible)')).toBe(`.x:has(.y${widened('focus-visible')})`);
        });
    });

    it('widens several pseudo-classes in one compound', () => {
        expect(rewritePseudoSelector('.a:hover:focus-visible')).toBe(`.a${widened('hover')}${widened('focus-visible')}`);
    });

    it('keeps sibling combinators and a trailing pseudo-element', () => {
        expect(rewritePseudoSelector('.input:focus-visible + .box::before')).toBe(`.input${widened('focus-visible')} + .box::before`);
        expect(rewritePseudoSelector('.input:focus ~ .label')).toBe(`.input${widened('focus')} ~ .label`);
        expect(rewritePseudoSelector('.a:hover::after')).toBe(`.a${widened('hover')}::after`);
    });

    describe('after a pseudo-element', () => {
        it('leaves a state that follows a pseudo-element, where :is() is not allowed', () => {
            expect(rewritePseudoSelector('::-webkit-scrollbar-thumb:hover')).toBeNull();
            expect(rewritePseudoSelector('.a::part(label):hover')).toBeNull();
            expect(rewritePseudoSelector('.a:before:hover')).toBeNull();
        });

        it('starts over at the next compound and the next list item', () => {
            expect(rewritePseudoSelector('.a::part(x) .b:hover')).toBe(`.a::part(x) .b${widened('hover')}`);
            expect(rewritePseudoSelector('.a::before, .b:hover')).toBe(`.a::before, .b${widened('hover')}`);
            expect(rewritePseudoSelector('.a::before,.b:hover')).toBe(`.a::before,.b${widened('hover')}`);
        });

        it('widens inside a pseudo-element argument', () => {
            expect(rewritePseudoSelector('::slotted(.a:hover)')).toBe(`::slotted(.a${widened('hover')})`);
        });
    });

    it('widens every item of a selector list and keeps the others as they are', () => {
        expect(rewritePseudoSelector('.a:hover, .b')).toBe(`.a${widened('hover')}, .b`);
        expect(rewritePseudoSelector('.a:hover,\n.b:focus')).toBe(`.a${widened('hover')},\n.b${widened('focus')}`);
    });

    // Compiled from ../LIB-sg-ui/projects/sg-ui-lib/components/**/*.scss, the
    // library this was built for. Each one is a form that a string replace or a
    // copied-out focus style gets wrong.
    describe('the rules of a real component library', () => {
        it.each([
            ['.sgui-checkbox__input:focus-visible + .sgui-checkbox__box::before', `.sgui-checkbox__input${widened('focus-visible')} + .sgui-checkbox__box::before`],
            ['.sgui-file-input:has(.sgui-file-input__control:focus-visible)', `.sgui-file-input:has(.sgui-file-input__control${widened('focus-visible')})`],
            [
                '.sgui-file-pill--grabbed:has(.sgui-file-pill__drag-handle--button:focus-visible)',
                `.sgui-file-pill--grabbed:has(.sgui-file-pill__drag-handle--button${widened('focus-visible')})`
            ],
            ['.sgui-pill--closeable:hover .sgui-pill__close:focus-visible', `.sgui-pill--closeable${widened('hover')} .sgui-pill__close${widened('focus-visible')}`],
            [
                '.sgui-checkbox:not(.sgui-checkbox--readonly):hover .sgui-checkbox__input:not(:disabled) + .sgui-checkbox__box::before',
                `.sgui-checkbox:not(.sgui-checkbox--readonly)${widened('hover')} .sgui-checkbox__input:not(:disabled) + .sgui-checkbox__box::before`
            ],
            [
                '.sgui-file-pill--interactive:has(.sgui-file-pill__content--button:hover) .sgui-file-pill__content--button:focus-visible',
                `.sgui-file-pill--interactive:has(.sgui-file-pill__content--button${widened('hover')}) .sgui-file-pill__content--button${widened('focus-visible')}`
            ]
        ])('%s', (selector, expected) => {
            expect(rewritePseudoSelector(selector)).toBe(expected);
        });
    });
});
