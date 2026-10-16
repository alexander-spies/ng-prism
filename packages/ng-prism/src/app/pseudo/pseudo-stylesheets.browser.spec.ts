import { PseudoStyleSheets, rewriteRules } from './pseudo-stylesheets.js';

function addStyle(css: string): HTMLStyleElement {
    const style = document.createElement('style');

    style.textContent = css;
    document.head.appendChild(style);
    return style;
}

function sheetOf(style: HTMLStyleElement): CSSStyleSheet {
    if (!style.sheet) throw new Error('style element has no sheet');
    return style.sheet;
}

function selectors(rules: CSSRuleList): string[] {
    return Array.from(rules).map((rule) => (rule as CSSStyleRule).selectorText ?? rule.constructor.name);
}

function isWidened(style: HTMLStyleElement): boolean {
    return selectors(sheetOf(style).cssRules).some((selector) => selector.includes('prism-pseudo--'));
}

function element(className: string): HTMLElement {
    const el = document.createElement('div');

    el.className = className;
    document.body.appendChild(el);
    return el;
}

/** Lets pending MutationObserver callbacks run. */
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    jest.restoreAllMocks();
});

describe('rewriteRules', () => {
    it('widens the selector in place, without adding a rule', () => {
        const sheet = sheetOf(addStyle('.a:hover { color: red; } .b { color: blue; }'));

        expect(rewriteRules(sheet)).toBe(1);
        expect(selectors(sheet.cssRules)).toEqual(['.a:is(:hover, .prism-pseudo--hover)', '.b']);
    });

    it('keeps the declarations, priorities included', () => {
        const sheet = sheetOf(addStyle('.a:focus-visible { box-shadow: 0 0 0 3px blue; outline: none !important; }'));

        rewriteRules(sheet);
        const rule = sheet.cssRules[0] as CSSStyleRule;

        expect(rule.style.getPropertyValue('box-shadow')).toBe('0 0 0 3px blue');
        expect(rule.style.getPropertyPriority('outline')).toBe('important');
    });

    it('leaves a sheet without forced pseudo-classes as it is', () => {
        const sheet = sheetOf(addStyle('.a { color: red; } .a:disabled { color: gray; } .a::before { content: ""; }'));

        expect(rewriteRules(sheet)).toBe(0);
        expect(selectors(sheet.cssRules)).toEqual(['.a', '.a:disabled', '.a::before']);
    });

    it('keeps the cascade between rules of equal specificity', () => {
        // `.x.late` comes after `.x:hover` and wins over it on a real hover. A
        // rule moved to the end of the sheet would win instead.
        addStyle('.x:hover { color: rgb(255, 0, 0); } .x.late { color: rgb(0, 128, 0); }');
        rewriteRules(document.styleSheets[0]);

        const el = element('x late prism-pseudo--hover');

        expect(getComputedStyle(el).color).toBe('rgb(0, 128, 0)');

        el.classList.remove('late');
        expect(getComputedStyle(el).color).toBe('rgb(255, 0, 0)');
    });

    describe('a negated state', () => {
        // A rule `.row:not(:hover) .actions { visibility: hidden }` hides the
        // actions until the row is hovered. Copying it with the class in place of
        // `:hover` would give a rule that matches every row without the class, a
        // really hovered one included, and hide its actions for good.
        it('matches exactly what it matched before while nothing is forced', () => {
            const sheet = sheetOf(addStyle('.row:not(:hover) .actions { visibility: hidden; }'));
            const row = element('row');
            const actions = document.createElement('span');

            actions.className = 'actions';
            row.appendChild(actions);
            const before = actions.matches((sheet.cssRules[0] as CSSStyleRule).selectorText);

            rewriteRules(sheet);
            expect(sheet.cssRules).toHaveLength(1);
            expect(actions.matches((sheet.cssRules[0] as CSSStyleRule).selectorText)).toBe(before);
        });

        it('stops matching a forced element', () => {
            addStyle('.box:not(:focus-visible) { color: rgb(255, 0, 0); }');
            rewriteRules(document.styleSheets[0]);

            expect(getComputedStyle(element('box')).color).toBe('rgb(255, 0, 0)');
            expect(getComputedStyle(element('box prism-pseudo--focus-visible')).color).not.toBe('rgb(255, 0, 0)');
        });
    });

    it.each([
        ['@media', '@media (min-width: 1px) { .a:hover { color: red; } }'],
        ['@supports', '@supports (display: grid) { .a:hover { color: red; } }'],
        ['@layer', '@layer base { .a:hover { color: red; } }'],
        ['@container', '@container (min-width: 1px) { .a:hover { color: red; } }']
    ])('widens inside %s', (_, css) => {
        const sheet = sheetOf(addStyle(css));

        expect(rewriteRules(sheet)).toBe(1);
        expect(selectors((sheet.cssRules[0] as CSSGroupingRule).cssRules)).toEqual(['.a:is(:hover, .prism-pseudo--hover)']);
    });

    it('recurses into a nested @media, the way a focus-ring mixin compiles', () => {
        const sheet = sheetOf(
            addStyle(`
                .sgui-toggle__input:focus-visible + .sgui-toggle__control { box-shadow: 0 0 0 3px blue; }
                @media (min-width: 1px) {
                    @media (forced-colors: active) {
                        .sgui-toggle__input:focus-visible + .sgui-toggle__control { outline: 3px solid transparent; }
                    }
                }
            `)
        );

        expect(rewriteRules(sheet)).toBe(2);
        const inner = ((sheet.cssRules[1] as CSSGroupingRule).cssRules[0] as CSSGroupingRule).cssRules;

        expect(selectors(inner)).toEqual(['.sgui-toggle__input:is(:focus-visible, .prism-pseudo--focus-visible) + .sgui-toggle__control']);
    });

    it('leaves @keyframes alone', () => {
        const sheet = sheetOf(addStyle('@keyframes pulse { from { opacity: 0; } to { opacity: 1; } }'));

        expect(rewriteRules(sheet)).toBe(0);
    });

    it('does not widen a selector twice when a sheet is rewritten again', () => {
        // A second PseudoStyleSheets in the same document, e.g. an app bootstrapped anew, starts with no record of what it rewrote.
        const sheet = sheetOf(addStyle('.a:hover { color: red; } @media (min-width: 1px) { .b:focus { color: blue; } }'));

        rewriteRules(sheet);
        expect(rewriteRules(sheet)).toBe(0);
        expect(selectors(sheet.cssRules)).toEqual(['.a:is(:hover, .prism-pseudo--hover)', 'CSSMediaRule']);
        expect(selectors((sheet.cssRules[1] as CSSGroupingRule).cssRules)).toEqual(['.b:is(:focus, .prism-pseudo--focus)']);
    });
});

describe('PseudoStyleSheets', () => {
    let sheets: PseudoStyleSheets;

    beforeEach(() => {
        sheets = new PseudoStyleSheets(document);
    });

    afterEach(() => sheets.release());

    it('rewrites nothing until it is acquired', async () => {
        const style = addStyle('.a:hover { color: red; }');

        await settle();
        expect(isWidened(style)).toBe(false);

        sheets.acquire();
        expect(isWidened(style)).toBe(true);
    });

    it('rewrites each sheet once', () => {
        const style = addStyle('.a:hover { color: red; }');
        const rule = sheetOf(style).cssRules[0] as CSSStyleRule;

        sheets.acquire();
        const once = rule.selectorText;

        sheets.sync();
        sheets.acquire();
        expect(rule.selectorText).toBe(once);
        sheets.release();
    });

    it('rewrites a stylesheet that arrives while it is held', async () => {
        sheets.acquire();
        const late = addStyle('.lazy:focus-visible { color: red; }');

        await settle();
        expect(selectors(sheetOf(late).cssRules)).toEqual(['.lazy:is(:focus-visible, .prism-pseudo--focus-visible)']);
    });

    it('rewrites a style element again once its content is replaced', async () => {
        const style = addStyle('.a:hover { color: red; }');

        sheets.acquire();
        style.textContent = '.a:hover { color: blue; }';
        await settle();
        expect(isWidened(style)).toBe(true);
    });

    it('stops watching once the last holder releases it', async () => {
        sheets.acquire();
        sheets.acquire();
        sheets.release();
        const whileHeld = addStyle('.a:hover { color: red; }');

        await settle();
        expect(isWidened(whileHeld)).toBe(true);

        sheets.release();
        const afterRelease = addStyle('.b:hover { color: red; }');

        await settle();
        expect(isWidened(afterRelease)).toBe(false);

        // The next use catches up.
        sheets.acquire();
        expect(isWidened(afterRelease)).toBe(true);
    });

    it('skips a cross-origin sheet once, with a warning', () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation();
        const crossOrigin = {
            href: 'https://fonts.example.com/face.css',
            get cssRules(): CSSRuleList {
                throw new DOMException('Cannot access rules', 'SecurityError');
            }
        } as unknown as CSSStyleSheet;

        sheets.rewriteSheet(crossOrigin);
        sheets.rewriteSheet(crossOrigin);

        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('https://fonts.example.com/face.css'));
    });

    it('comes back to a sheet whose rules are not readable yet', () => {
        // A `<link>` that is still loading throws something other than a SecurityError.
        const real = sheetOf(addStyle('.a:hover { color: red; }'));
        let loaded = false;
        const pending = {
            href: '/styles.css',
            get cssRules(): CSSRuleList {
                if (!loaded) throw new DOMException('Not loaded yet', 'InvalidAccessError');
                return real.cssRules;
            }
        } as unknown as CSSStyleSheet;
        const warn = jest.spyOn(console, 'warn').mockImplementation();

        sheets.rewriteSheet(pending);
        loaded = true;
        sheets.rewriteSheet(pending);

        expect(warn).not.toHaveBeenCalled();
        expect(selectors(real.cssRules)).toEqual(['.a:is(:hover, .prism-pseudo--hover)']);
    });
});
