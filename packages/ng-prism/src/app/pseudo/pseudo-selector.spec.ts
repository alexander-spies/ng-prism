import { PSEUDO_STATES } from '../../shared/pseudo-state.type.js';
import { pseudoStateClass, rewritePseudoSelector } from './pseudo-selector.js';

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
    it('replaces a forced pseudo-class with its class', () => {
        expect(rewritePseudoSelector('.btn:hover')).toBe('.btn.prism-pseudo--hover');
    });

    it.each(PSEUDO_STATES)('rewrites :%s', (state) => {
        expect(rewritePseudoSelector(`.a:${state}`)).toBe(`.a.prism-pseudo--${state}`);
    });

    it('reads the whole name, so :focus, :focus-visible and :focus-within stay apart', () => {
        expect(rewritePseudoSelector('.a:focus')).toBe('.a.prism-pseudo--focus');
        expect(rewritePseudoSelector('.a:focus-visible')).toBe('.a.prism-pseudo--focus-visible');
        expect(rewritePseudoSelector('.a:focus-within')).toBe('.a.prism-pseudo--focus-within');
    });

    it('returns null when the selector forces nothing', () => {
        expect(rewritePseudoSelector('.a:disabled')).toBeNull();
        expect(rewritePseudoSelector('.a::before')).toBeNull();
        expect(rewritePseudoSelector('.a:first-child > .b')).toBeNull();
        expect(rewritePseudoSelector('.hovered')).toBeNull();
    });

    it('matches the pseudo-class case-insensitively, like CSS does', () => {
        expect(rewritePseudoSelector('.a:HOVER')).toBe('.a.prism-pseudo--hover');
    });

    it('can stand alone or after a type or universal selector', () => {
        expect(rewritePseudoSelector(':focus-visible')).toBe('.prism-pseudo--focus-visible');
        expect(rewritePseudoSelector('a:hover')).toBe('a.prism-pseudo--hover');
        expect(rewritePseudoSelector('*:active')).toBe('*.prism-pseudo--active');
    });

    describe('escapes', () => {
        it('leaves an escaped colon in a class name alone', () => {
            expect(rewritePseudoSelector('.md\\:hover')).toBeNull();
            expect(rewritePseudoSelector('.md\\:hover\\:bg-blue')).toBeNull();
        });

        it('still rewrites a real pseudo-class after an escaped one', () => {
            expect(rewritePseudoSelector('.md\\:hover:hover')).toBe('.md\\:hover.prism-pseudo--hover');
        });

        it('treats the whitespace closing a hex escape as part of the escape', () => {
            // `\3a ` is an escaped colon. Its trailing space ends the escape and is no combinator.
            expect(rewritePseudoSelector('.md\\3a hover')).toBeNull();
            expect(rewritePseudoSelector('.md\\3a hover:focus')).toBe('.md\\3a hover.prism-pseudo--focus');
        });
    });

    describe('attribute selectors and strings', () => {
        it('does not look into attribute values', () => {
            expect(rewritePseudoSelector('[title=":hover"]')).toBeNull();
            expect(rewritePseudoSelector("[data-state='a:focus']:focus")).toBe("[data-state='a:focus'].prism-pseudo--focus");
        });

        it('passes the attributes of emulated encapsulation through', () => {
            expect(rewritePseudoSelector('.btn[_ngcontent-ng-c123]:focus-visible')).toBe('.btn[_ngcontent-ng-c123].prism-pseudo--focus-visible');
            expect(rewritePseudoSelector('[_nghost-ng-c1]:hover .x[_ngcontent-ng-c1]')).toBe('[_nghost-ng-c1].prism-pseudo--hover .x[_ngcontent-ng-c1]');
        });

        it('does not look into a quoted :lang() argument', () => {
            expect(rewritePseudoSelector(':lang("x:hover")')).toBeNull();
        });
    });

    describe('functional pseudo-classes', () => {
        it('rewrites the arguments of :is(), :where() and :not()', () => {
            expect(rewritePseudoSelector(':is(.a:hover, .b) .c')).toBe(':is(.a.prism-pseudo--hover, .b) .c');
            expect(rewritePseudoSelector(':where(:focus-visible)')).toBe(':where(.prism-pseudo--focus-visible)');
            expect(rewritePseudoSelector('.a:not(:focus-visible)')).toBe('.a:not(.prism-pseudo--focus-visible)');
        });

        it('rewrites inside :has()', () => {
            expect(rewritePseudoSelector('.x:has(.y:focus-visible)')).toBe('.x:has(.y.prism-pseudo--focus-visible)');
        });

        it('does not split the selector list at a comma inside parentheses', () => {
            expect(rewritePseudoSelector(':is(.a, .b):hover')).toBe(':is(.a, .b).prism-pseudo--hover');
        });
    });

    it('rewrites several pseudo-classes in one compound', () => {
        expect(rewritePseudoSelector('.a:hover:focus-visible')).toBe('.a.prism-pseudo--hover.prism-pseudo--focus-visible');
    });

    it('keeps sibling combinators and a trailing pseudo-element', () => {
        expect(rewritePseudoSelector('.input:focus-visible + .box::before')).toBe('.input.prism-pseudo--focus-visible + .box::before');
        expect(rewritePseudoSelector('.input:focus ~ .label')).toBe('.input.prism-pseudo--focus ~ .label');
        expect(rewritePseudoSelector('.a:hover::after')).toBe('.a.prism-pseudo--hover::after');
    });

    describe('after a pseudo-element', () => {
        it('leaves a state that follows a pseudo-element, where a class is not allowed', () => {
            expect(rewritePseudoSelector('::-webkit-scrollbar-thumb:hover')).toBeNull();
            expect(rewritePseudoSelector('.a::part(label):hover')).toBeNull();
            expect(rewritePseudoSelector('.a:before:hover')).toBeNull();
        });

        it('starts over at the next compound', () => {
            expect(rewritePseudoSelector('.a::part(x) .b:hover')).toBe('.a::part(x) .b.prism-pseudo--hover');
            expect(rewritePseudoSelector('.a::before, .b:hover')).toBe('.b.prism-pseudo--hover');
        });

        it('rewrites inside a pseudo-element argument', () => {
            expect(rewritePseudoSelector('::slotted(.a:hover)')).toBe('::slotted(.a.prism-pseudo--hover)');
        });
    });

    describe('selector lists', () => {
        it('keeps only the items it rewrote', () => {
            expect(rewritePseudoSelector('.a:hover, .b')).toBe('.a.prism-pseudo--hover');
            expect(rewritePseudoSelector('.b, .a:hover')).toBe('.a.prism-pseudo--hover');
        });

        it('keeps every item that forces a state', () => {
            expect(rewritePseudoSelector('.a:hover,\n.b:focus')).toBe('.a.prism-pseudo--hover, .b.prism-pseudo--focus');
        });
    });

    // Compiled from ../LIB-sg-ui/projects/sg-ui-lib/components/**/*.scss, the
    // library this was built for. Each one is a form that a string replace or a
    // copied-out focus style gets wrong.
    describe('the rules of a real component library', () => {
        it.each([
            ['.sgui-checkbox__input:focus-visible + .sgui-checkbox__box::before', '.sgui-checkbox__input.prism-pseudo--focus-visible + .sgui-checkbox__box::before'],
            ['.sgui-file-input:has(.sgui-file-input__control:focus-visible)', '.sgui-file-input:has(.sgui-file-input__control.prism-pseudo--focus-visible)'],
            [
                '.sgui-file-pill--grabbed:has(.sgui-file-pill__drag-handle--button:focus-visible)',
                '.sgui-file-pill--grabbed:has(.sgui-file-pill__drag-handle--button.prism-pseudo--focus-visible)'
            ],
            ['.sgui-pill--closeable:hover .sgui-pill__close:focus-visible', '.sgui-pill--closeable.prism-pseudo--hover .sgui-pill__close.prism-pseudo--focus-visible'],
            [
                '.sgui-checkbox:not(.sgui-checkbox--readonly):hover .sgui-checkbox__input:not(:disabled) + .sgui-checkbox__box::before',
                '.sgui-checkbox:not(.sgui-checkbox--readonly).prism-pseudo--hover .sgui-checkbox__input:not(:disabled) + .sgui-checkbox__box::before'
            ],
            [
                '.sgui-file-pill--interactive:has(.sgui-file-pill__content--button:hover) .sgui-file-pill__content--button:focus-visible',
                '.sgui-file-pill--interactive:has(.sgui-file-pill__content--button.prism-pseudo--hover) .sgui-file-pill__content--button.prism-pseudo--focus-visible'
            ]
        ])('%s', (selector, expected) => {
            expect(rewritePseudoSelector(selector)).toBe(expected);
        });
    });
});
