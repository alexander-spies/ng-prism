import type { ForcedPseudoStates } from '../../shared/pseudo-state.type.js';
import { describeTarget, evaluateStateFit, reachableTargets, type StateFit } from './state-fit.js';

function mount(html: string, parent: HTMLElement = document.body): HTMLElement {
    const host = document.createElement('div');

    host.innerHTML = html;
    parent.appendChild(host);
    return host.firstElementChild as HTMLElement;
}

function addStyle(css: string): HTMLStyleElement {
    const style = document.createElement('style');

    style.textContent = css;
    document.head.appendChild(style);
    return style;
}

const fitsNot = (reason: string): StateFit => ({ fits: false, reason });

describe('state-fit', () => {
    afterEach(() => {
        document.head.innerHTML = '';
        document.body.innerHTML = '';
        jest.restoreAllMocks();
    });

    describe('describeTarget', () => {
        it('names the component for true', () => {
            expect(describeTarget(true)).toBe('the component');
        });

        it('returns a selector as it is', () => {
            expect(describeTarget('.btn')).toBe('.btn');
        });

        it('joins a selector list with a comma', () => {
            expect(describeTarget(['.a', '.b'])).toBe('.a, .b');
        });
    });

    describe('evaluateStateFit', () => {
        it('fits when every pseudo-class finds a reachable target', () => {
            const root = mount('<lib-chip><span class="label"></span><button class="btn"></button></lib-chip>');

            expect(evaluateStateFit(root, { hover: '.label', 'focus-visible': '.btn' })).toEqual({ fits: true });
        });

        it('forces no state', () => {
            const root = mount('<lib-chip><button class="btn"></button></lib-chip>');

            expect(evaluateStateFit(root, {})).toEqual(fitsNot('forces no state'));
        });

        it('reports a selector that matches nothing', () => {
            const root = mount('<lib-chip><span class="sg-chip__label"></span></lib-chip>');

            expect(evaluateStateFit(root, { hover: '.sg-chip__remove' })).toEqual(fitsNot('.sg-chip__remove matches nothing'));
        });

        it('keeps focus off a disabled button', () => {
            const root = mount('<lib-button><button class="btn" disabled></button></lib-button>');

            expect(evaluateStateFit(root, { focus: '.btn' })).toEqual(fitsNot('.btn is disabled'));
            expect(evaluateStateFit(root, { 'focus-visible': '.btn' })).toEqual(fitsNot('.btn is disabled'));
        });

        it('keeps focus off a button inside a disabled fieldset', () => {
            const root = mount('<lib-form><fieldset disabled><button class="btn"></button></fieldset></lib-form>');

            expect(evaluateStateFit(root, { 'focus-visible': '.btn' })).toEqual(fitsNot('.btn is disabled'));
        });

        it('keeps focus off an element under inert inside the component', () => {
            const root = mount('<lib-dialog><div inert><button class="btn"></button></div></lib-dialog>');

            expect(evaluateStateFit(root, { 'focus-visible': '.btn' })).toEqual(fitsNot('.btn is inert'));
        });

        it('keeps focus off the component host when it is inert itself', () => {
            const root = mount('<lib-dialog inert class="dialog"><button></button></lib-dialog>');

            expect(evaluateStateFit(root, { focus: '.dialog' })).toEqual(fitsNot('.dialog is inert'));
        });

        it('ignores inert outside the component root', () => {
            const outer = mount('<div inert><lib-button><button class="btn"></button></lib-button></div>');
            const root = outer.querySelector('lib-button') as HTMLElement;

            expect(evaluateStateFit(root, { 'focus-visible': '.btn' })).toEqual({ fits: true });
        });

        it('reports a disabled element before an inert one', () => {
            const root = mount('<lib-form><button class="btn" disabled></button><div inert><button class="btn"></button></div></lib-form>');

            expect(evaluateStateFit(root, { focus: '.btn' })).toEqual(fitsNot('.btn is disabled'));
        });

        it('keeps an aria-disabled element focusable', () => {
            const root = mount('<lib-button><button class="btn" aria-disabled="true"></button></lib-button>');

            expect(evaluateStateFit(root, { 'focus-visible': '.btn' })).toEqual({ fits: true });
        });

        it('fits when one of several targets is reachable', () => {
            const root = mount('<lib-form><button class="btn" disabled></button><button class="btn"></button></lib-form>');

            expect(evaluateStateFit(root, { focus: '.btn' })).toEqual({ fits: true });
        });

        it('keeps hover off an element with pointer-events: none', () => {
            addStyle('.btn:disabled { pointer-events: none; }');
            const root = mount('<lib-button><button class="btn" disabled></button></lib-button>');

            expect(evaluateStateFit(root, { hover: '.btn' })).toEqual(fitsNot('.btn has pointer-events: none'));
            expect(evaluateStateFit(root, { active: '.btn' })).toEqual(fitsNot('.btn has pointer-events: none'));
        });

        it('lets hover reach an element whose child re-enables pointer-events', () => {
            addStyle('.btn { pointer-events: none; } .btn__icon { pointer-events: auto; }');
            const root = mount('<lib-button><button class="btn"><span class="btn__icon"></span></button></lib-button>');

            expect(evaluateStateFit(root, { hover: '.btn' })).toEqual({ fits: true });
        });

        it('keeps hover off a subtree that inherits pointer-events: none', () => {
            addStyle('.btn { pointer-events: none; }');
            const root = mount('<lib-button><button class="btn"><span class="btn__icon"></span></button></lib-button>');

            expect(evaluateStateFit(root, { hover: '.btn' })).toEqual(fitsNot('.btn has pointer-events: none'));
        });

        it('lets hover reach a disabled button without pointer-events: none', () => {
            const root = mount('<lib-button><button class="btn" disabled></button></lib-button>');

            expect(evaluateStateFit(root, { hover: '.btn', active: '.btn' })).toEqual({ fits: true });
        });

        it('does not filter focus-within', () => {
            const root = mount('<lib-field><div class="field"><input disabled /></div></lib-field>');

            expect(evaluateStateFit(root, { 'focus-within': '.field' })).toEqual({ fits: true });
        });

        it('reports a focus-within selector that matches nothing', () => {
            const root = mount('<lib-field><input /></lib-field>');

            expect(evaluateStateFit(root, { 'focus-within': '.field' })).toEqual(fitsNot('.field matches nothing'));
        });

        it('needs every pseudo-class to fit', () => {
            const root = mount('<lib-button><button class="btn" disabled></button></lib-button>');

            expect(evaluateStateFit(root, { hover: '.btn', 'focus-visible': '.btn' })).toEqual(fitsNot('.btn is disabled'));
        });

        it('reports the first pseudo-class that does not fit, in state order', () => {
            addStyle('.btn { pointer-events: none; }');
            const root = mount('<lib-button><button class="btn" disabled></button></lib-button>');
            const pseudo: ForcedPseudoStates = { 'focus-visible': '.btn', hover: '.btn' };

            expect(evaluateStateFit(root, pseudo)).toEqual(fitsNot('.btn has pointer-events: none'));
        });

        it('describes a selector list and true as the target', () => {
            const root = mount('<fieldset disabled><button></button></fieldset>');

            expect(evaluateStateFit(root, { focus: ['.a', '.b'] })).toEqual(fitsNot('.a, .b matches nothing'));
            expect(evaluateStateFit(root, { focus: true })).toEqual(fitsNot('the component is disabled'));
        });

        it('lets true fit as soon as one element is reachable', () => {
            const root = mount('<lib-button><button class="btn" disabled></button><a class="link" href="#">x</a></lib-button>');

            expect(evaluateStateFit(root, { 'focus-visible': true })).toEqual({ fits: true });
        });

        describe('focus on the whole component', () => {
            it.each(['focus', 'focus-visible'] as const)('does not fit %s when the only focusable element is disabled', (state) => {
                const root = mount('<lib-button><button class="btn" disabled><span class="btn__label">Save</span></button></lib-button>');

                expect(evaluateStateFit(root, { [state]: true })).toEqual(fitsNot('the component is disabled'));
            });

            it('does not fit when the only focusable element is inert', () => {
                const root = mount('<lib-dialog><div inert><button></button></div><p>Text</p></lib-dialog>');

                expect(evaluateStateFit(root, { 'focus-visible': true })).toEqual(fitsNot('the component is inert'));
            });

            it('counts a host that takes focus through tabindex', () => {
                const root = mount('<lib-card tabindex="0"><button disabled></button></lib-card>');

                expect(evaluateStateFit(root, { focus: true })).toEqual({ fits: true });
            });

            it.each([
                ['a link', '<a href="#">x</a>'],
                ['a field', '<input />'],
                ['an editable region', '<div contenteditable="true"></div>'],
                ['a summary', '<details><summary>More</summary></details>']
            ])('fits when %s next to the disabled button can take focus', (_, html) => {
                const root = mount(`<lib-row><button disabled></button>${html}</lib-row>`);

                expect(evaluateStateFit(root, { 'focus-visible': true })).toEqual({ fits: true });
            });

            it('does not count a link without href or a region that is not editable', () => {
                const root = mount('<lib-row><a>x</a><div contenteditable="false"></div><button disabled></button></lib-row>');

                expect(evaluateStateFit(root, { focus: true })).toEqual(fitsNot('the component is disabled'));
            });

            it('falls back to every element when nothing in the component is focusable', () => {
                const root = mount('<lib-badge><span class="badge__count">3</span></lib-badge>');

                expect(evaluateStateFit(root, { 'focus-visible': true })).toEqual({ fits: true });
            });

            it('leaves a selector and the other pseudo-classes with true as they were', () => {
                const root = mount('<lib-form><div class="wrap"><button disabled></button></div></lib-form>');

                expect(evaluateStateFit(root, { focus: '.wrap' })).toEqual({ fits: true });
                expect(evaluateStateFit(root, { hover: true, active: true, 'focus-within': true })).toEqual({ fits: true });
            });
        });

        it('ignores an empty selector like the marker does', () => {
            const root = mount('<lib-button><button class="btn"></button></lib-button>');

            expect(evaluateStateFit(root, { hover: '', 'focus-visible': '.btn' })).toEqual({ fits: true });
            expect(evaluateStateFit(root, { hover: '' })).toEqual(fitsNot('forces no state'));
        });

        it('treats an invalid selector as matching nothing', () => {
            const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
            const root = mount('<lib-button><button class="btn"></button></lib-button>');

            expect(evaluateStateFit(root, { hover: '::nope(' })).toEqual(fitsNot('::nope( matches nothing'));
            expect(warn).toHaveBeenCalledTimes(1);
        });
    });

    describe('reachableTargets', () => {
        it('returns the subset of elements focus can reach', () => {
            const root = mount('<lib-form><button class="a" disabled></button><button class="b"></button><div inert><button class="c"></button></div></lib-form>');
            const buttons = Array.from(root.querySelectorAll('button'));

            expect(reachableTargets(root, 'focus', buttons).map((el) => el.className)).toEqual(['b']);
        });

        it('returns the subset of elements the pointer can reach for hover', () => {
            addStyle('.off { pointer-events: none; }');
            const root = mount('<lib-form><button class="on"></button><button class="off"></button></lib-form>');
            const buttons = Array.from(root.querySelectorAll('button'));

            expect(reachableTargets(root, 'hover', buttons).map((el) => el.className)).toEqual(['on']);
        });

        it('keeps every element for focus-within', () => {
            const root = mount('<lib-form><button class="a" disabled></button><div inert><button class="b"></button></div></lib-form>');
            const buttons = Array.from(root.querySelectorAll('button'));

            expect(reachableTargets(root, 'focus-within', buttons)).toEqual(buttons);
        });

        it('keeps the order of the elements it was given', () => {
            const root = mount('<lib-form><button class="a"></button><button class="b"></button></lib-form>');
            const [a, b] = Array.from(root.querySelectorAll('button'));

            expect(reachableTargets(root, 'active', new Set([b, a]))).toEqual([b, a]);
        });
    });
});
