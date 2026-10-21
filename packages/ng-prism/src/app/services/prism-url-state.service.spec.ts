import { ApplicationRef, effect, untracked } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ShowcaseState } from '../../decorator/showcase.types.js';
import type { NgPrismConfig, RuntimeComponent, RuntimeManifest } from '../../plugin/plugin.types.js';
import type { RuntimeService } from '../../plugin/service.types.js';
import { PRISM_CONFIG, PRISM_MANIFEST } from '../tokens/prism-tokens.js';
import { CAPTURE_PARAM } from './prism-capture.service.js';
import { PrismNavigationService } from './prism-navigation.service.js';
import { PrismPanelService } from './prism-panel.service.js';
import { PrismRendererService } from './prism-renderer.service.js';
import { PrismUrlStateService } from './prism-url-state.service.js';

function createComponent(
    overrides: Partial<{
        className: string;
        title: string;
        variants: { name: string; states?: false }[];
        states: ShowcaseState[];
        inputs: RuntimeComponent['meta']['inputs'];
    }> = {}
): RuntimeComponent {
    return {
        type: class {} as any,
        meta: {
            className: overrides.className ?? 'Comp',
            filePath: '/test.ts',
            showcaseConfig: {
                title: overrides.title ?? 'Default',
                variants: overrides.variants,
                states: overrides.states
            },
            inputs: overrides.inputs ?? [],
            outputs: [],
            componentMeta: { selector: 'test', standalone: true, isDirective: false }
        }
    };
}

function createService(className = 'ToastService'): RuntimeService {
    return {
        meta: {
            className,
            filePath: '/test.service.ts',
            showcaseConfig: { title: className },
            provision: 'auto',
            api: { tags: {}, properties: [], methods: [], setup: [], types: [] }
        }
    };
}

function setUrl(search: string): void {
    window.history.replaceState({}, '', `/${search}`);
}

const STATES: ShowcaseState[] = [
    { name: 'Hover', pseudo: { hover: true } },
    { name: 'Focus', pseudo: { 'focus-visible': true } }
];

function flush(): void {
    TestBed.inject(ApplicationRef).tick();
}

/**
 * What a mounted `PrismRendererComponent` (the Playground) does when the active
 * component changes: it reconciles the renderer service with it, on top of the
 * service's own reconcile on navigation. The URL service restores the variant
 * and the state in the same tick, so this runs on top of them. Specs for a view
 * without a renderer leave it out.
 */
function mirrorRendererComponent(): void {
    const nav = TestBed.inject(PrismNavigationService);
    const renderer = TestBed.inject(PrismRendererService);

    TestBed.runInInjectionContext(() =>
        effect(() => {
            const comp = nav.activeComponent();

            if (!comp) return;
            untracked(() => renderer.reconcileForComponent(comp));
        })
    );
}

/** A real history traversal: jsdom fires `popstate` asynchronously, after the entry has changed. */
function goBack(): Promise<void> {
    return new Promise((resolve) => {
        window.addEventListener('popstate', () => resolve(), { once: true });
        window.history.back();
    });
}

function setup(
    manifest: RuntimeManifest,
    config: NgPrismConfig = {}
): {
    url: PrismUrlStateService;
    nav: PrismNavigationService;
    renderer: PrismRendererService;
    panel: PrismPanelService;
} {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
        providers: [
            { provide: PRISM_MANIFEST, useValue: manifest },
            { provide: PRISM_CONFIG, useValue: config }
        ]
    });
    return {
        url: TestBed.inject(PrismUrlStateService),
        nav: TestBed.inject(PrismNavigationService),
        renderer: TestBed.inject(PrismRendererService),
        panel: TestBed.inject(PrismPanelService)
    };
}

describe('PrismUrlStateService', () => {
    beforeEach(() => {
        window.history.replaceState({}, '', '/');
        jest.restoreAllMocks();
    });

    afterEach(() => {
        TestBed.resetTestingModule();
    });

    describe('init - restore from URL', () => {
        it('should do nothing when URL has no params', () => {
            const comp = createComponent({ className: 'Foo' });
            const { url, nav } = setup({ components: [comp] });

            url.init();

            expect(nav.activeItem()).toBeNull();
        });

        it('should restore component by className', () => {
            const comp = createComponent({ className: 'SguiButton' });

            setUrl('?component=SguiButton');
            const { url, nav } = setup({ components: [comp] });

            url.init();

            expect(nav.activeComponent()).toBe(comp);
        });

        it('should restore variant index', () => {
            const comp = createComponent({
                className: 'SguiButton',
                variants: [{ name: 'V1' }, { name: 'V2' }, { name: 'V3' }]
            });

            setUrl('?component=SguiButton&variant=2');
            const { url, renderer } = setup({ components: [comp] });

            url.init();

            expect(renderer.activeVariantIndex()).toBe(2);
        });

        it('should restore page by title', () => {
            const page = {
                type: 'component' as const,
                title: 'ButtonPatterns',
                category: 'Docs',
                component: class {} as any
            };

            setUrl('?page=ButtonPatterns');
            const { url, nav } = setup({ components: [], pages: [page] });

            url.init();

            expect(nav.activePage()).toBe(page);
        });

        it('should restore view id', () => {
            setUrl('?view=api');
            const { url, panel } = setup({ components: [] });

            url.init();

            expect(panel.activeViewId()).toBe('api');
        });

        it('should ignore unknown component className without crashing', () => {
            const comp = createComponent({ className: 'Real' });

            setUrl('?component=Unknown');
            const { url, nav } = setup({ components: [comp] });

            url.init();

            expect(nav.activeComponent()).toBeNull();
        });

        it('should ignore out-of-range variant index', () => {
            const comp = createComponent({
                className: 'SguiButton',
                variants: [{ name: 'V1' }]
            });

            setUrl('?component=SguiButton&variant=99');
            const { url, renderer } = setup({ components: [comp] });

            url.init();

            expect(renderer.activeVariantIndex()).toBe(0);
        });

        it('should ignore NaN variant value', () => {
            const comp = createComponent({
                className: 'SguiButton',
                variants: [{ name: 'V1' }, { name: 'V2' }]
            });

            setUrl('?component=SguiButton&variant=abc');
            const { url, renderer } = setup({ components: [comp] });

            url.init();

            expect(renderer.activeVariantIndex()).toBe(0);
        });
    });

    describe('init - write to URL', () => {
        it('should write component className to URL on select', () => {
            const comp = createComponent({ className: 'SguiButton' });
            const { url, nav } = setup({ components: [comp] });

            url.init();
            nav.select(comp);
            flush();

            expect(window.location.search).toBe('?component=SguiButton');
        });

        it('should write variant only when > 0', () => {
            const comp = createComponent({
                className: 'SguiButton',
                variants: [{ name: 'V1' }, { name: 'V2' }]
            });
            const { url, nav, renderer } = setup({ components: [comp] });

            url.init();
            nav.select(comp);
            flush();
            expect(window.location.search).toBe('?component=SguiButton');

            renderer.activeVariantIndex.set(1);
            flush();
            expect(window.location.search).toBe('?component=SguiButton&variant=1');

            renderer.activeVariantIndex.set(0);
            flush();
            expect(window.location.search).toBe('?component=SguiButton');
        });

        it('should write view only when != renderer', () => {
            const comp = createComponent({ className: 'SguiButton' });
            const { url, nav, panel } = setup({ components: [comp] });

            url.init();
            nav.select(comp);
            panel.activeViewId.set('api');
            flush();

            expect(window.location.search).toBe('?component=SguiButton&view=api');
        });

        it('should write page title instead of component', () => {
            const page = {
                type: 'component' as const,
                title: 'Patterns',
                category: 'Docs',
                component: class {} as any
            };
            const { url, nav } = setup({ components: [], pages: [page] });

            url.init();
            nav.selectPage(page);
            flush();

            expect(window.location.search).toBe('?page=Patterns');
        });
    });

    describe('history API behavior', () => {
        it('should use pushState when component changes', () => {
            const a = createComponent({ className: 'A' });
            const b = createComponent({ className: 'B' });
            const pushSpy = jest.spyOn(window.history, 'pushState');
            const { url, nav } = setup({ components: [a, b] });

            url.init();
            nav.select(a);
            flush();
            pushSpy.mockClear();

            nav.select(b);
            flush();

            expect(pushSpy).toHaveBeenCalledTimes(1);
        });

        it('should use replaceState when variant changes', () => {
            const comp = createComponent({
                className: 'A',
                variants: [{ name: 'V1' }, { name: 'V2' }]
            });
            const replaceSpy = jest.spyOn(window.history, 'replaceState');
            const { url, nav, renderer } = setup({ components: [comp] });

            url.init();
            nav.select(comp);
            flush();
            replaceSpy.mockClear();

            renderer.activeVariantIndex.set(1);
            flush();

            expect(replaceSpy).toHaveBeenCalledTimes(1);
        });

        it('should use replaceState when view changes', () => {
            const comp = createComponent({ className: 'A' });
            const replaceSpy = jest.spyOn(window.history, 'replaceState');
            const { url, nav, panel } = setup({ components: [comp] });

            url.init();
            nav.select(comp);
            flush();
            replaceSpy.mockClear();

            panel.activeViewId.set('api');
            flush();

            expect(replaceSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('popstate handling', () => {
        it('should re-read URL on popstate event', () => {
            const a = createComponent({ className: 'A' });
            const b = createComponent({ className: 'B' });
            const { url, nav } = setup({ components: [a, b] });

            url.init();
            nav.select(a);
            flush();

            setUrl('?component=B');
            window.dispatchEvent(new PopStateEvent('popstate'));

            expect(nav.activeComponent()).toBe(b);
        });
    });

    describe('opt-out via config', () => {
        it('should not register effect when config.urlState is false', () => {
            const comp = createComponent({ className: 'A' });
            const pushSpy = jest.spyOn(window.history, 'pushState');
            const { url, nav } = setup({ components: [comp] }, { urlState: false });

            url.init();
            nav.select(comp);
            flush();

            expect(pushSpy).not.toHaveBeenCalled();
            expect(window.location.search).toBe('');
        });

        it('should not restore from URL when config.urlState is false', () => {
            const comp = createComponent({ className: 'A' });

            setUrl('?component=A');
            const { url, nav } = setup({ components: [comp] }, { urlState: false });

            url.init();

            expect(nav.activeComponent()).toBeNull();
        });
    });

    describe('suppressSync', () => {
        it('should not re-write URL during restoreFromUrl', () => {
            const comp = createComponent({ className: 'A' });

            setUrl('?component=A');
            const pushSpy = jest.spyOn(window.history, 'pushState');
            const replaceSpy = jest.spyOn(window.history, 'replaceState');
            const { url } = setup({ components: [comp] });

            url.init();
            flush();

            expect(pushSpy).not.toHaveBeenCalled();
            expect(replaceSpy).not.toHaveBeenCalled();
        });
    });

    describe('panel param', () => {
        it('should restore panel from URL', () => {
            const comp = createComponent({ className: 'Foo' });

            setUrl('?component=Foo&panel=events');
            const { url, panel } = setup({ components: [comp] });

            url.init();

            expect(panel.activePanelId()).toBe('events');
        });

        it('should write panel to URL when changed (non-default)', () => {
            const comp = createComponent({ className: 'Foo' });

            setUrl('?component=Foo');
            const { url, panel, nav } = setup({ components: [comp] });

            url.init();
            nav.select(comp);
            panel.activePanelId.set('a11y');
            flush();

            expect(window.location.search).toContain('panel=a11y');
        });

        it('should omit panel from URL when value is default (controls)', () => {
            const comp = createComponent({ className: 'Foo' });

            setUrl('?component=Foo&panel=a11y');
            const { url, panel, nav } = setup({ components: [comp] });

            url.init();
            nav.select(comp);
            panel.activePanelId.set('controls');
            flush();

            expect(window.location.search).not.toContain('panel=');
        });
    });

    describe('state param', () => {
        it('should restore the state from the URL', () => {
            const comp = createComponent({ className: 'Foo', states: STATES });

            setUrl('?component=Foo&state=1');
            const { url, renderer } = setup({ components: [comp] });

            url.init();

            expect(renderer.activeStateIndex()).toBe(1);
        });

        it.each(['2', '99', '-1', 'abc', '1.5', '1abc', ''])('should ignore the state "%s", which is no index into the states', (value) => {
            const comp = createComponent({ className: 'Foo', states: STATES });

            setUrl(`?component=Foo&state=${value}`);
            const { url, renderer } = setup({ components: [comp] });

            url.init();

            expect(renderer.activeStateIndex()).toBeNull();
        });

        it('should ignore a state on a component without states', () => {
            const comp = createComponent({ className: 'Foo' });

            setUrl('?component=Foo&state=0');
            const { url, renderer } = setup({ components: [comp] });

            url.init();

            expect(renderer.activeStateIndex()).toBeNull();
        });

        it('should ignore a state on a page', () => {
            const page = {
                type: 'component' as const,
                title: 'Patterns',
                category: 'Docs',
                component: class {} as any
            };

            setUrl('?page=Patterns&state=0');
            const { url, renderer } = setup({ components: [], pages: [page] });

            url.init();

            expect(renderer.activeStateIndex()).toBeNull();
        });

        it('should restore the variant and the state together', () => {
            const comp = createComponent({
                className: 'Foo',
                variants: [{ name: 'V1' }, { name: 'V2' }, { name: 'V3' }],
                states: STATES
            });

            setUrl('?component=Foo&variant=2&state=1');
            const { url, renderer } = setup({ components: [comp] });

            url.init();

            expect(renderer.activeVariantIndex()).toBe(2);
            expect(renderer.activeStateIndex()).toBe(1);
        });

        it('should write the active state', () => {
            const comp = createComponent({ className: 'Foo', states: STATES });
            const { url, nav, renderer } = setup({ components: [comp] });

            url.init();
            nav.select(comp);
            flush();
            expect(window.location.search).toBe('?component=Foo');

            renderer.selectState(1);
            flush();
            expect(window.location.search).toBe('?component=Foo&state=1');

            renderer.selectState(0);
            flush();
            expect(window.location.search).toBe('?component=Foo&state=0');

            renderer.selectState(null);
            flush();
            expect(window.location.search).toBe('?component=Foo');
        });

        it('should write the state after the variant', () => {
            const comp = createComponent({
                className: 'Foo',
                variants: [{ name: 'V1' }, { name: 'V2' }],
                states: STATES
            });
            const { url, nav, renderer } = setup({ components: [comp] });

            url.init();
            nav.select(comp);
            renderer.activeVariantIndex.set(1);
            renderer.selectState(1);
            flush();

            expect(window.location.search).toBe('?component=Foo&variant=1&state=1');
        });

        it('should use replaceState when only the state changes', () => {
            const comp = createComponent({ className: 'Foo', states: STATES });
            const pushSpy = jest.spyOn(window.history, 'pushState');
            const replaceSpy = jest.spyOn(window.history, 'replaceState');
            const { url, nav, renderer } = setup({ components: [comp] });

            url.init();
            nav.select(comp);
            flush();
            pushSpy.mockClear();
            replaceSpy.mockClear();

            renderer.selectState(1);
            flush();

            expect(pushSpy).not.toHaveBeenCalled();
            expect(replaceSpy).toHaveBeenCalledTimes(1);
        });

        it('should not write the state next to a page', () => {
            const page = {
                type: 'component' as const,
                title: 'Patterns',
                category: 'Docs',
                component: class {} as any
            };
            const { url, nav, renderer } = setup({ components: [], pages: [page] });

            url.init();
            renderer.selectState(1);
            nav.selectPage(page);
            flush();

            expect(window.location.search).toBe('?page=Patterns');
        });

        it('should drop the state when the component changes', () => {
            const a = createComponent({ className: 'A', states: STATES });
            const b = createComponent({ className: 'B', states: STATES });
            const { url, nav, renderer } = setup({ components: [a, b] });

            mirrorRendererComponent();
            url.init();
            nav.select(a);
            renderer.selectState(1);
            flush();
            expect(window.location.search).toBe('?component=A&state=1');

            nav.select(b);
            flush();

            expect(renderer.activeStateIndex()).toBeNull();
            expect(window.location.search).toBe('?component=B');
        });

        // No `mirrorRendererComponent()`: outside the Playground no renderer is mounted to see the switch.
        it('should drop the variant and the state when the component changes outside the Playground', () => {
            const a = createComponent({
                className: 'A',
                variants: [{ name: 'V1' }, { name: 'V2' }, { name: 'V3' }],
                states: STATES
            });
            const b = createComponent({ className: 'B' });
            const { url, nav, renderer, panel } = setup({ components: [a, b] });

            url.init();
            nav.select(a);
            panel.activeViewId.set('overview');
            renderer.selectVariant(2);
            renderer.selectState(1);
            flush();
            expect(window.location.search).toBe('?component=A&variant=2&state=1&view=overview');

            const pushSpy = jest.spyOn(window.history, 'pushState');
            const replaceSpy = jest.spyOn(window.history, 'replaceState');

            nav.select(b);
            flush();

            expect(renderer.activeVariantIndex()).toBe(0);
            expect(renderer.activeStateIndex()).toBeNull();
            expect(window.location.search).toBe('?component=B&view=overview');
            // Not even for one write: a pushed entry with them would come back on the next back button.
            const written = [...pushSpy.mock.calls, ...replaceSpy.mock.calls].map(([, , href]) => String(href));

            expect(written).toEqual(['/?component=B&view=overview']);
        });

        it('should restore a cell of another component outside the Playground on popstate', async () => {
            const a = createComponent({
                className: 'A',
                variants: [{ name: 'V1' }, { name: 'V2' }, { name: 'V3' }],
                states: STATES
            });
            const b = createComponent({ className: 'B' });
            const { url, nav, renderer, panel } = setup({ components: [a, b] });

            url.init();
            nav.select(a);
            panel.activeViewId.set('overview');
            renderer.selectVariant(2);
            renderer.selectState(1);
            flush();
            nav.select(b);
            flush();
            expect(window.location.search).toBe('?component=B&view=overview');

            await goBack();
            flush();

            expect(nav.activeComponent()).toBe(a);
            expect(renderer.activeVariantIndex()).toBe(2);
            expect(renderer.activeStateIndex()).toBe(1);
            expect(window.location.search).toBe('?component=A&variant=2&state=1&view=overview');
        });

        it('should restore the variant and the state on popstate', async () => {
            const a = createComponent({
                className: 'A',
                variants: [{ name: 'V1' }, { name: 'V2' }, { name: 'V3' }],
                states: STATES
            });
            const b = createComponent({ className: 'B', states: STATES });
            const { url, nav, renderer } = setup({ components: [a, b] });

            mirrorRendererComponent();
            url.init();
            nav.select(a);
            flush();
            renderer.activeVariantIndex.set(2);
            renderer.selectState(1);
            flush();
            expect(window.location.search).toBe('?component=A&variant=2&state=1');

            nav.select(b);
            flush();
            expect(window.location.search).toBe('?component=B');

            await goBack();
            flush();

            expect(nav.activeComponent()).toBe(a);
            expect(renderer.activeVariantIndex()).toBe(2);
            expect(renderer.activeStateIndex()).toBe(1);
            expect(window.location.search).toBe('?component=A&variant=2&state=1');
        });

        it('should clear the state on popstate to a URL without one', async () => {
            const a = createComponent({ className: 'A', states: STATES });
            const b = createComponent({ className: 'B', states: STATES });
            const { url, nav, renderer } = setup({ components: [a, b] });

            mirrorRendererComponent();
            url.init();
            nav.select(a);
            flush();
            nav.select(b);
            flush();
            renderer.selectState(1);
            flush();
            expect(window.location.search).toBe('?component=B&state=1');

            await goBack();
            flush();

            expect(nav.activeComponent()).toBe(a);
            expect(renderer.activeStateIndex()).toBeNull();
            expect(window.location.search).toBe('?component=A');
        });

        it('should keep control overrides when popstate addresses the active cell', () => {
            const comp = createComponent({
                className: 'Foo',
                variants: [{ name: 'V1' }, { name: 'V2' }, { name: 'V3' }],
                states: STATES,
                inputs: [{ name: 'label', type: 'string', required: false }]
            });

            setUrl('?component=Foo&variant=1&state=1');
            const { url, nav, renderer } = setup({ components: [comp] });

            mirrorRendererComponent();
            url.init();
            flush();
            renderer.updateInput('label', 'Custom');
            flush();

            const resetSpy = jest.spyOn(renderer, 'resetForComponent');
            const selectVariantSpy = jest.spyOn(renderer, 'selectVariant');

            // What a click on a `<a href="#">` inside the component does: popstate to the address on screen.
            window.dispatchEvent(new PopStateEvent('popstate'));
            flush();

            expect(resetSpy).not.toHaveBeenCalled();
            expect(selectVariantSpy).not.toHaveBeenCalled();
            expect(renderer.inputValues()['label']).toBe('Custom');
            expect(nav.activeComponent()).toBe(comp);
            expect(renderer.activeVariantIndex()).toBe(1);
            expect(renderer.activeStateIndex()).toBe(1);
        });

        it('should bring the variant and the state back on popstate to the same component without them', () => {
            const comp = createComponent({
                className: 'Foo',
                variants: [{ name: 'V1' }, { name: 'V2' }, { name: 'V3' }],
                states: STATES
            });

            setUrl('?component=Foo&variant=2&state=1');
            const { url, renderer } = setup({ components: [comp] });

            mirrorRendererComponent();
            url.init();
            flush();
            expect(renderer.activeVariantIndex()).toBe(2);
            expect(renderer.activeStateIndex()).toBe(1);

            setUrl('?component=Foo');
            window.dispatchEvent(new PopStateEvent('popstate'));
            flush();

            expect(renderer.activeVariantIndex()).toBe(0);
            expect(renderer.activeStateIndex()).toBeNull();
            expect(window.location.search).toBe('?component=Foo');
        });

        it('should keep the state on a variant that opts out', () => {
            const comp = createComponent({
                className: 'Foo',
                variants: [{ name: 'V1' }, { name: 'Plain', states: false }],
                states: STATES
            });

            setUrl('?component=Foo&variant=1&state=1');
            const { url, nav, renderer } = setup({ components: [comp] });

            mirrorRendererComponent();
            url.init();
            flush();

            expect(renderer.activeVariantIndex()).toBe(1);
            expect(renderer.activeStateIndex()).toBe(1);
            expect(nav.activeComponent()).toBe(comp);
            expect(window.location.search).toBe('?component=Foo&variant=1&state=1');
        });
    });

    describe('capture flag', () => {
        afterEach(() => {
            document.documentElement.removeAttribute('data-prism-capture');
            document.getElementById('ng-prism-capture-styles')?.remove();
        });

        it('should never write the capture flag back to the URL', () => {
            const comp = createComponent({ className: 'Foo' });

            setUrl('?component=Foo&capture=1');
            const { url, nav } = setup({ components: [comp] });

            url.init();
            nav.select(comp);
            flush();

            expect(window.location.search).not.toContain(CAPTURE_PARAM);
        });

        it('should still restore navigation state alongside the capture flag', () => {
            const comp = createComponent({
                className: 'Foo',
                variants: [{ name: 'V1' }, { name: 'V2' }, { name: 'V3' }]
            });

            setUrl('?capture=1&component=Foo&variant=2');
            const { url, nav, renderer } = setup({ components: [comp] });

            url.init();

            expect(nav.activeComponent()).toBe(comp);
            expect(renderer.activeVariantIndex()).toBe(2);
        });

        it('should not reintroduce the capture flag on popstate', () => {
            const comp = createComponent({ className: 'Foo' });

            setUrl('?component=Foo&capture=1');
            const { url, nav } = setup({ components: [comp] });

            url.init();
            window.dispatchEvent(new PopStateEvent('popstate'));
            nav.select(comp);
            flush();

            expect(window.location.search).not.toContain(CAPTURE_PARAM);
        });
    });

    describe('service param', () => {
        it('restores ?service=', () => {
            const toast = createService('ToastService');

            setUrl('?service=ToastService');
            const { url, nav } = setup({ components: [], services: [toast] });

            url.init();

            expect(nav.activeService()?.meta.className).toBe('ToastService');
            expect(nav.activeService()).toBe(toast);
            expect(nav.activeComponent()).toBeNull();
        });

        it('restores the service before a page', () => {
            const toast = createService('ToastService');
            const page = { type: 'component' as const, title: 'Intro', component: class {} as any };

            setUrl('?service=ToastService&page=Intro');
            const { url, nav } = setup({ components: [], services: [toast], pages: [page] });

            url.init();

            expect(nav.activeService()).toBe(toast);
            expect(nav.activePage()).toBeNull();
        });

        it('selects nothing for an unknown service className', () => {
            const toast = createService('ToastService');

            setUrl('?service=Gone');
            const { url, nav } = setup({ components: [], services: [toast] });

            url.init();

            expect(nav.activeItem()).toBeNull();
        });

        it('writes service=<className> without variant or state', () => {
            const comp = createComponent({ className: 'Btn', variants: [{ name: 'V1' }, { name: 'V2' }], states: STATES });
            const toast = createService('ToastService');
            const { url, nav, renderer } = setup({ components: [comp], services: [toast] });

            url.init();
            nav.select(comp);
            renderer.activeVariantIndex.set(1);
            renderer.selectState(0);
            flush();
            expect(window.location.search).toBe('?component=Btn&variant=1&state=0');

            nav.selectService(toast);
            flush();

            expect(window.location.search).toBe('?service=ToastService');
        });

        it('writes the view and the panel next to the service', () => {
            const toast = createService('ToastService');
            const { url, nav, panel } = setup({ components: [], services: [toast] });

            url.init();
            nav.selectService(toast);
            panel.activeViewId.set('api');
            panel.activePanelId.set('jsdoc');
            flush();

            expect(window.location.search).toBe('?service=ToastService&view=api&panel=jsdoc');
        });

        it('pushes history when switching from a component to a service', () => {
            const comp = createComponent({ className: 'Btn' });
            const toast = createService('ToastService');
            const pushSpy = jest.spyOn(window.history, 'pushState');
            const { url, nav } = setup({ components: [comp], services: [toast] });

            url.init();
            nav.select(comp);
            flush();
            pushSpy.mockClear();

            nav.selectService(toast);
            flush();

            expect(pushSpy).toHaveBeenCalledTimes(1);
        });

        it('pushes history when switching between two services and replaces it for a view change', () => {
            const a = createService('A');
            const b = createService('B');
            const pushSpy = jest.spyOn(window.history, 'pushState');
            const replaceSpy = jest.spyOn(window.history, 'replaceState');
            const { url, nav, panel } = setup({ components: [], services: [a, b] });

            url.init();
            nav.selectService(a);
            flush();
            pushSpy.mockClear();
            replaceSpy.mockClear();

            nav.selectService(b);
            flush();
            expect(pushSpy).toHaveBeenCalledTimes(1);

            pushSpy.mockClear();
            panel.activeViewId.set('api');
            flush();
            expect(pushSpy).not.toHaveBeenCalled();
            expect(replaceSpy).toHaveBeenCalledTimes(1);
        });

        it('re-reads a service on popstate', () => {
            const comp = createComponent({ className: 'Btn' });
            const toast = createService('ToastService');
            const { url, nav } = setup({ components: [comp], services: [toast] });

            url.init();
            nav.select(comp);
            flush();

            setUrl('?service=ToastService');
            window.dispatchEvent(new PopStateEvent('popstate'));

            expect(nav.activeService()).toBe(toast);
        });
    });
});
