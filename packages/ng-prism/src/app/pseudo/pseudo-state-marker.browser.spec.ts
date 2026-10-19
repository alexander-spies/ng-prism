import type { RuntimeComponent } from '../../plugin/plugin.types.js';
import type { ForcedPseudoStates } from '../../shared/pseudo-state.type.js';
import { resolveRenderedKey } from '../renderer/rendered-key.js';
import { appliedStateNames, forcesAnyState, PseudoStateMarker } from './pseudo-state-marker.js';
import { PseudoStyleSheets } from './pseudo-stylesheets.js';

const FV = 'prism-pseudo--focus-visible';
const HOVER = 'prism-pseudo--hover';

/** Lets pending MutationObserver callbacks run. */
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

function mount(html: string): HTMLElement {
    const host = document.createElement('div');

    host.innerHTML = html;
    document.body.appendChild(host);
    return host.firstElementChild as HTMLElement;
}

function addStyle(css: string): HTMLStyleElement {
    const style = document.createElement('style');

    style.textContent = css;
    document.head.appendChild(style);
    return style;
}

function withClass(root: Element, cls: string): string[] {
    return [root, ...Array.from(root.querySelectorAll('*'))]
        .filter((el) => el.classList.contains(cls))
        .map((el) => el.className.split(' ')[0] || el.tagName.toLowerCase());
}

describe('PseudoStateMarker', () => {
    let sheets: PseudoStyleSheets;
    let marker: PseudoStateMarker;

    beforeEach(() => {
        sheets = new PseudoStyleSheets(document);
        marker = new PseudoStateMarker(sheets);
    });

    afterEach(() => {
        marker.clear();
        document.head.innerHTML = '';
        document.body.innerHTML = '';
        jest.restoreAllMocks();
    });

    describe('targets', () => {
        it('puts the class on the host and every element inside it for true', () => {
            const root = mount('<lib-pill class="pill"><span class="pill__label"></span><button class="pill__close"></button></lib-pill>');

            marker.apply(root, { hover: true });
            expect(withClass(root, HOVER)).toEqual(['pill', 'pill__label', 'pill__close']);
        });

        it('limits a selector to the matching elements', () => {
            const root = mount('<lib-button><button class="btn"></button><span class="hint"></span></lib-button>');

            marker.apply(root, { 'focus-visible': '.btn' });
            expect(withClass(root, FV)).toEqual(['btn']);
        });

        it('matches a selector against the host as well', () => {
            const root = mount('<lib-pill class="sgui-pill sgui-pill--closeable"><button class="sgui-pill__close"></button></lib-pill>');

            marker.apply(root, { hover: '.sgui-pill', 'focus-visible': '.sgui-pill__close' });
            expect(withClass(root, HOVER)).toEqual(['sgui-pill']);
            expect(withClass(root, FV)).toEqual(['sgui-pill__close']);
        });

        it('takes a list of selectors', () => {
            const root = mount('<div class="row"><button class="a"></button><button class="b"></button><button class="c"></button></div>');

            marker.apply(root, { focus: ['.a', '.c'] });
            expect(withClass(root, 'prism-pseudo--focus')).toEqual(['a', 'c']);
        });

        it('does not reach outside the root', () => {
            mount('<button class="btn outside"></button>');
            const root = mount('<lib-button><button class="btn"></button></lib-button>');

            marker.apply(root, { 'focus-visible': '.btn' });
            expect(document.querySelectorAll(`.${FV}`)).toHaveLength(1);
        });

        it('skips an invalid selector with a warning and keeps the other states', () => {
            const warn = jest.spyOn(console, 'warn').mockImplementation();
            const root = mount('<div class="box"></div>');

            marker.apply(root, { hover: '.box[', focus: true });
            expect(warn).toHaveBeenCalledWith('[ng-prism] ".box[" in forced pseudo states is not a valid selector, skipping it.');
            expect(root.classList.contains('prism-pseudo--focus')).toBe(true);
            expect(root.classList.contains(HOVER)).toBe(false);
        });
    });

    describe('a state layer', () => {
        const state = { 'focus-visible': '.btn' } satisfies ForcedPseudoStates;

        it('puts the state only on reachable targets', () => {
            const root = mount('<lib-button><button class="btn" disabled></button><button class="btn"></button></lib-button>');
            const [disabled, enabled] = Array.from(root.querySelectorAll('button'));

            marker.apply(root, null, state);
            expect(disabled.classList.contains(FV)).toBe(false);
            expect(enabled.classList.contains(FV)).toBe(true);
            expect(marker.applied()?.fit).toEqual({ fits: true });
        });

        it('does not apply a state that does not fit, and says why', () => {
            const root = mount('<lib-chip><span class="sg-chip__label"></span></lib-chip>');

            marker.apply(root, null, { 'focus-visible': '.sg-chip__remove' });
            expect(marker.applied()?.fit).toEqual({ fits: false, reason: '.sg-chip__remove matches nothing' });
            expect(root.outerHTML).not.toContain('prism-pseudo--');
        });

        it('applies the state once its target appears', async () => {
            const root = mount('<lib-chip></lib-chip>');

            marker.apply(root, null, { 'focus-visible': '.sg-chip__remove' });
            const remove = document.createElement('button');

            remove.className = 'sg-chip__remove';
            root.appendChild(remove);
            await settle();
            expect(marker.applied()?.fit).toEqual({ fits: true });
            expect(remove.classList.contains(FV)).toBe(true);
        });

        it('takes the state back once its target stops being reachable', async () => {
            const root = mount('<lib-button><button class="btn"></button></lib-button>');
            const button = root.querySelector('button')!;

            marker.apply(root, null, state);
            button.disabled = true;
            await settle();
            expect(marker.applied()?.fit).toEqual({ fits: false, reason: '.btn is disabled' });
            expect(button.classList.contains(FV)).toBe(false);
        });

        it("keeps the variant's own states unfiltered", () => {
            const root = mount('<lib-button><button class="btn" disabled></button></lib-button>');

            marker.apply(root, { 'focus-visible': '.btn' }, null);
            expect(root.querySelector('.btn')!.classList.contains(FV)).toBe(true);
            expect(marker.applied()?.fit).toBeNull();
        });

        it("forces the variant's states and the state together", () => {
            const root = mount('<lib-button><button class="btn"></button></lib-button>');

            marker.apply(root, { hover: '.btn' }, state);
            expect(withClass(root, HOVER)).toEqual(['btn']);
            expect(withClass(root, FV)).toEqual(['btn']);
        });

        it('stays applied for a state that does not fit, even without states of its own', () => {
            const root = mount('<lib-button><button class="btn"></button></lib-button>');

            marker.apply(root, null, { hover: '.missing' });
            expect(marker.applied()?.root).toBe(root);
            marker.apply(root, null, null);
            expect(marker.applied()).toBeNull();
        });

        it('keeps the objects it was given', () => {
            const root = mount('<lib-button><button class="btn"></button></lib-button>');
            const states = { hover: '.btn' };

            marker.apply(root, states, state);
            expect(marker.applied()?.states).toBe(states);
            expect(marker.applied()?.state).toBe(state);

            marker.apply(root, states);
            expect(marker.applied()?.state).toBeNull();
            expect(marker.applied()?.fit).toBeNull();

            marker.apply(root, null, state);
            expect(marker.applied()?.states).toBeNull();
        });

        it('replaces the previous state and its fit when the state switches', () => {
            const root = mount('<lib-button><button class="btn"></button></lib-button>');

            marker.apply(root, null, { hover: '.missing' });
            expect(marker.applied()?.fit?.fits).toBe(false);

            marker.apply(root, null, { hover: '.btn' });
            expect(marker.applied()?.fit).toEqual({ fits: true });
            expect(withClass(root, HOVER)).toEqual(['btn']);

            marker.apply(root, null, state);
            expect(withClass(root, HOVER)).toEqual([]);
            expect(withClass(root, FV)).toEqual(['btn']);
        });

        it('leaves the applied states alone while nothing about the fit changes', async () => {
            const root = mount('<lib-button><button class="btn"></button></lib-button>');

            marker.apply(root, null, state);
            const before = marker.applied();

            root.setAttribute('data-touched', '');
            root.querySelector('button')!.className = 'btn btn--filled';
            await settle();
            expect(marker.applied()).toBe(before);
        });

        it("clear removes the state's classes too", () => {
            const root = mount('<lib-button><button class="btn"></button></lib-button>');

            marker.apply(root, { hover: true }, state);
            marker.clear();
            expect(root.outerHTML).not.toContain('prism-pseudo--');
            expect(marker.applied()).toBeNull();
        });
    });

    describe('while it is applied', () => {
        it('marks an element rendered later', async () => {
            const root = mount('<lib-field></lib-field>');

            marker.apply(root, { 'focus-visible': '.field__input' });
            const input = document.createElement('input');

            input.className = 'field__input';
            root.appendChild(input);
            await settle();
            expect(input.classList.contains(FV)).toBe(true);
        });

        it('follows a selector when an element starts or stops matching it', async () => {
            const root = mount('<div><button class="tab"></button><button class="tab tab--active"></button></div>');
            const [first, second] = Array.from(root.querySelectorAll('button'));

            marker.apply(root, { hover: '.tab--active' });
            first.classList.add('tab--active');
            second.classList.remove('tab--active');
            await settle();
            expect(first.classList.contains(HOVER)).toBe(true);
            expect(second.classList.contains(HOVER)).toBe(false);
        });

        it('follows a selector that depends on an attribute', async () => {
            const root = mount('<div><button class="btn" disabled></button></div>');
            const button = root.querySelector('button')!;

            marker.apply(root, { hover: 'button:not([disabled])' });
            expect(button.classList.contains(HOVER)).toBe(false);

            button.removeAttribute('disabled');
            await settle();
            expect(button.classList.contains(HOVER)).toBe(true);
        });

        it('puts a class back that the component removed', async () => {
            const root = mount('<div><button class="btn"></button></div>');
            const button = root.querySelector('button')!;

            marker.apply(root, { 'focus-visible': '.btn' });
            button.className = 'btn btn--filled';
            await settle();
            expect(button.classList.contains(FV)).toBe(true);
        });
    });

    describe('switching variants', () => {
        it('replaces the previous states on the same root', () => {
            const root = mount('<div class="box"><span class="inner"></span></div>');

            marker.apply(root, { hover: true });
            marker.apply(root, { 'focus-visible': '.inner' });
            expect(withClass(root, HOVER)).toEqual([]);
            expect(withClass(root, FV)).toEqual(['inner']);
        });

        it('removes every class for a variant without forced states', () => {
            const root = mount('<div class="box"><span class="inner"></span></div>');

            marker.apply(root, { hover: true, active: '.inner' });
            marker.apply(root, undefined);
            expect(root.outerHTML).not.toContain('prism-pseudo--');
            expect(marker.applied()).toBeNull();
        });

        it('cleans up the old root when the component is rendered anew', () => {
            const oldRoot = mount('<div class="box"></div>');
            const newRoot = mount('<div class="box"></div>');

            marker.apply(oldRoot, { hover: true });
            marker.apply(newRoot, { hover: true });
            expect(oldRoot.classList.contains(HOVER)).toBe(false);
            expect(newRoot.classList.contains(HOVER)).toBe(true);
        });

        it('stops following the root once cleared', async () => {
            const root = mount('<div></div>');

            marker.apply(root, { hover: '.late' });
            marker.clear();
            const late = document.createElement('span');

            late.className = 'late';
            root.appendChild(late);
            await settle();
            expect(late.classList.contains(HOVER)).toBe(false);
        });
    });

    describe('stylesheets', () => {
        it('leaves the stylesheets alone while nothing is forced', () => {
            const style = addStyle('.a:hover { color: red; }');
            const root = mount('<div class="a"></div>');

            marker.apply(root, null);
            marker.apply(root, {});
            expect((style.sheet!.cssRules[0] as CSSStyleRule).selectorText).toBe('.a:hover');
        });

        it('makes the component CSS paint the forced state, and stops once cleared', () => {
            addStyle('.box { color: rgb(0, 0, 0); } .box:focus-visible { color: rgb(255, 0, 0); }');
            const root = mount('<div class="box"></div>');

            marker.apply(root, { 'focus-visible': true });
            expect(getComputedStyle(root).color).toBe('rgb(255, 0, 0)');

            marker.clear();
            expect(getComputedStyle(root).color).toBe('rgb(0, 0, 0)');
        });

        it('rewrites styles a component adds after the first render', async () => {
            const root = mount('<div class="lazy"></div>');

            marker.apply(root, { hover: true });
            addStyle('.lazy:hover { color: rgb(0, 0, 255); }');
            await settle();
            expect(getComputedStyle(root).color).toBe('rgb(0, 0, 255)');
        });
    });

    // The hard cases from ../LIB-sg-ui, compiled. Only the forced element
    // carries the class, and the rule still lands on the element it styles.
    describe('the rules of a real component library', () => {
        it('reaches a sibling of a visually hidden input', () => {
            addStyle('.sgui-checkbox__input:focus-visible + .sgui-checkbox__box { color: rgb(255, 0, 0); }');
            const root = mount('<sgui-checkbox><input class="sgui-checkbox__input" /><span class="sgui-checkbox__box"></span></sgui-checkbox>');

            marker.apply(root, { 'focus-visible': '.sgui-checkbox__input' });
            expect(getComputedStyle(root.querySelector('.sgui-checkbox__box')!).color).toBe('rgb(255, 0, 0)');
        });

        it('reaches an ancestor through :has()', () => {
            addStyle('.sgui-file-input:has(.sgui-file-input__control:focus-visible) { color: rgb(255, 0, 0); }');
            const root = mount('<sgui-file-input class="sgui-file-input"><input class="sgui-file-input__control" /></sgui-file-input>');

            marker.apply(root, { 'focus-visible': '.sgui-file-input__control' });
            expect(getComputedStyle(root).color).toBe('rgb(255, 0, 0)');
        });

        it('combines two forced states in one selector', () => {
            // jsdom resolves the cascade by source order alone, so the more specific rule comes last here too.
            addStyle(
                '.sgui-pill__close:focus-visible { color: rgb(0, 0, 255); }' + '.sgui-pill--closeable:hover .sgui-pill__close:focus-visible { color: rgb(255, 0, 0); }'
            );
            const root = mount('<sgui-pill class="sgui-pill sgui-pill--closeable"><button class="sgui-pill__close"></button></sgui-pill>');
            const close = root.querySelector('.sgui-pill__close')!;

            marker.apply(root, { 'focus-visible': '.sgui-pill__close' });
            expect(getComputedStyle(close).color).toBe('rgb(0, 0, 255)');

            marker.apply(root, { hover: '.sgui-pill', 'focus-visible': '.sgui-pill__close' });
            expect(getComputedStyle(close).color).toBe('rgb(255, 0, 0)');
        });

        it('applies a focus rule nested in @media', () => {
            // jsdom's getComputedStyle skips @media blocks, so this asks the rule itself.
            const style = addStyle('@media (forced-colors: active) { .sgui-toggle__input:focus-visible + .sgui-toggle__control { outline: 3px solid transparent; } }');
            const root = mount('<sgui-toggle><input class="sgui-toggle__input" /><span class="sgui-toggle__control"></span></sgui-toggle>');
            const control = root.querySelector('.sgui-toggle__control')!;
            const rulesInMedia = () => Array.from((style.sheet!.cssRules[0] as CSSMediaRule).cssRules) as CSSStyleRule[];

            marker.apply(root, { 'focus-visible': '.sgui-toggle__input' });
            expect(rulesInMedia().filter((rule) => control.matches(rule.selectorText))).toHaveLength(1);

            marker.clear();
            expect(rulesInMedia().filter((rule) => control.matches(rule.selectorText))).toHaveLength(0);
        });
    });

    describe('overview cells', () => {
        it('scopes each cell to its own component', () => {
            addStyle('.btn { color: rgb(0, 0, 0); } .btn:hover { color: rgb(255, 0, 0); }');
            const plain = mount('<lib-button><button class="btn"></button></lib-button>');
            const hovered = mount('<lib-button><button class="btn"></button></lib-button>');
            const plainCell = new PseudoStateMarker(sheets);
            const hoveredCell = new PseudoStateMarker(sheets);

            plainCell.apply(plain, undefined);
            hoveredCell.apply(hovered, { hover: '.btn' });

            expect(getComputedStyle(plain.querySelector('.btn')!).color).toBe('rgb(0, 0, 0)');
            expect(getComputedStyle(hovered.querySelector('.btn')!).color).toBe('rgb(255, 0, 0)');
            hoveredCell.clear();
        });

        it('keeps the stylesheets watched until the last cell lets go', async () => {
            const a = new PseudoStateMarker(sheets);
            const b = new PseudoStateMarker(sheets);

            a.apply(mount('<div></div>'), { hover: true });
            b.apply(mount('<div></div>'), { hover: true });
            a.clear();
            const late = addStyle('.late:hover { color: red; }');

            await settle();
            expect((late.sheet!.cssRules[0] as CSSStyleRule).selectorText).toContain('prism-pseudo--hover');
            b.clear();
        });
    });
});

describe('forcesAnyState', () => {
    it.each<[ForcedPseudoStates | null | undefined, boolean]>([
        [undefined, false],
        [null, false],
        [{}, false],
        [{ hover: '' }, false],
        [{ hover: [] }, false],
        [{ hover: true }, true],
        [{ focus: '.a' }, true],
        [{ focus: ['', '.a'] }, true]
    ])('%j forces a state: %s', (states, expected) => {
        expect(forcesAnyState(states)).toBe(expected);
    });
});

describe('appliedStateNames', () => {
    let marker: PseudoStateMarker;

    beforeEach(() => {
        marker = new PseudoStateMarker(new PseudoStyleSheets(document));
    });

    afterEach(() => {
        marker.clear();
        document.body.innerHTML = '';
    });

    it('is empty while nothing is applied', () => {
        expect(appliedStateNames(null)).toEqual([]);
    });

    it('lists the states and, while it fits, the state', () => {
        const root = mount('<lib-button><button class="btn"></button></lib-button>');

        marker.apply(root, { hover: true }, { 'focus-visible': '.btn' });
        expect(appliedStateNames(marker.applied())).toEqual(['hover', 'focus-visible']);
    });

    it('leaves out a state that does not fit', () => {
        const root = mount('<lib-button><button class="btn" disabled></button></lib-button>');

        marker.apply(root, { hover: true }, { 'focus-visible': '.btn' });
        expect(appliedStateNames(marker.applied())).toEqual(['hover']);
    });

    it('does not count an empty selector as a forced state', () => {
        const root = mount('<lib-button><button class="btn"></button></lib-button>');

        marker.apply(root, { hover: '' }, { focus: '.btn' });
        expect(appliedStateNames(marker.applied())).toEqual(['focus']);
    });
});

describe('data-prism-rendered and forced states', () => {
    const component = { meta: { className: 'ButtonComponent' } } as RuntimeComponent;
    let marker: PseudoStateMarker;

    beforeEach(() => {
        marker = new PseudoStateMarker(new PseudoStyleSheets(document));
    });

    afterEach(() => {
        marker.clear();
        document.body.innerHTML = '';
    });

    it('is only set once the forced state is in place', () => {
        const element = mount('<lib-button><button class="btn"></button></lib-button>');
        const pseudo = { 'focus-visible': '.btn' };
        const key = () => resolveRenderedKey({ component, variantIndex: 3, element, pseudo, pseudoApplied: marker.applied() });

        expect(key()).toBeNull();

        marker.apply(element, pseudo);
        expect(element.querySelector('.btn')!.classList.contains(FV)).toBe(true);
        expect(key()).toBe('ButtonComponent:3');
    });

    it('is withheld again when the variant switches to other states', () => {
        const element = mount('<lib-button><button class="btn"></button></lib-button>');
        const focused = { 'focus-visible': '.btn' };
        const hovered = { hover: '.btn' };

        marker.apply(element, focused);
        expect(resolveRenderedKey({ component, variantIndex: 4, element, pseudo: hovered, pseudoApplied: marker.applied() })).toBeNull();

        marker.apply(element, hovered);
        expect(resolveRenderedKey({ component, variantIndex: 4, element, pseudo: hovered, pseudoApplied: marker.applied() })).toBe('ButtonComponent:4');
    });

    it('is withheld for a new element until the states are on it', () => {
        const oldElement = mount('<lib-button></lib-button>');
        const newElement = mount('<lib-button></lib-button>');
        const pseudo = { hover: true as const };

        marker.apply(oldElement, pseudo);
        expect(resolveRenderedKey({ component, variantIndex: 0, element: newElement, pseudo, pseudoApplied: marker.applied() })).toBeNull();
    });

    it('does not hold back a variant without forced states', () => {
        const element = mount('<lib-button></lib-button>');

        expect(resolveRenderedKey({ component, variantIndex: 1, element, pseudo: null, pseudoApplied: null })).toBe('ButtonComponent:1');
        expect(resolveRenderedKey({ component, variantIndex: 1, element, pseudo: {}, pseudoApplied: null })).toBe('ButtonComponent:1');
    });
});
