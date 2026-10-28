import { ApplicationRef, computed, effect, signal, type Type, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { RuntimePipe } from '../../plugin/pipe.types.js';
import type { PanelDefinition, RuntimeComponent } from '../../plugin/plugin.types.js';
import type { RuntimeService } from '../../plugin/service.types.js';
import { PRISM_BUILTIN_PANELS } from '../tokens/prism-tokens.js';
import { PrismNavigationService } from './prism-navigation.service.js';
import { PrismPanelService } from './prism-panel.service.js';
import { PrismPluginService } from './prism-plugin.service.js';

function makeComponent(className = 'ButtonComponent'): RuntimeComponent {
    return {
        type: class {} as Type<unknown>,
        meta: {
            className,
            filePath: '/button.ts',
            showcaseConfig: { title: 'Button' },
            inputs: [],
            outputs: [],
            componentMeta: {
                selector: 'lib-button',
                standalone: true,
                isDirective: false
            }
        }
    };
}

function makeService(className = 'ToastService'): RuntimeService {
    return {
        meta: {
            className,
            filePath: '/toast.service.ts',
            showcaseConfig: { title: 'Toast' },
            provision: 'auto',
            api: { tags: {}, properties: [], methods: [], setup: [], types: [] }
        }
    };
}

function makePipe(className = 'TruncatePipe'): RuntimePipe {
    return {
        meta: {
            className,
            filePath: '/truncate.pipe.ts',
            showcaseConfig: { title: 'Truncate' },
            pipeName: 'truncate',
            api: { tags: {}, transform: [], setup: [], types: [] }
        }
    };
}

function createService(
    options: {
        builtins?: PanelDefinition[];
        pluginViewPanels?: PanelDefinition[];
        activeComponent?: RuntimeComponent | null;
        /** A signal to drive the active component from the spec; `activeComponent` is its start value. */
        activeComponentSignal?: WritableSignal<RuntimeComponent | null>;
        activeService?: RuntimeService | null;
        /** A signal to drive the active service from the spec; `activeService` is its start value. */
        activeServiceSignal?: WritableSignal<RuntimeService | null>;
        activePipe?: RuntimePipe | null;
        /** A signal to drive the active pipe from the spec; `activePipe` is its start value. */
        activePipeSignal?: WritableSignal<RuntimePipe | null>;
    } = {}
): PrismPanelService {
    const pluginStub = {
        panels: signal([]).asReadonly(),
        viewPanels: signal(options.pluginViewPanels ?? []).asReadonly()
    } as unknown as PrismPluginService;
    const activeComponent = options.activeComponentSignal ?? signal(options.activeComponent ?? null);
    // The real `activeTarget` is derived from the three re-linked signals the
    // same way: at most one of them is non-null.
    const activeService = options.activeServiceSignal ?? signal(options.activeService ?? null);
    const activePipe = options.activePipeSignal ?? signal(options.activePipe ?? null);
    const navigationStub = {
        activeComponent: activeComponent.asReadonly(),
        activeService: activeService.asReadonly(),
        activePipe: activePipe.asReadonly(),
        activeTarget: computed(() => (activeComponent() ? 'component' : activeService() ? 'service' : activePipe() ? 'pipe' : null))
    } as unknown as PrismNavigationService;

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
        providers: [
            { provide: PrismPluginService, useValue: pluginStub },
            { provide: PrismNavigationService, useValue: navigationStub },
            { provide: PRISM_BUILTIN_PANELS, useValue: options.builtins ?? [] }
        ]
    });
    return TestBed.inject(PrismPanelService);
}

function flush(): void {
    TestBed.inject(ApplicationRef).tick();
}

describe('PrismPanelService', () => {
    afterEach(() => {
        TestBed.resetTestingModule();
    });

    it('defaults activePanelId to "controls"', () => {
        expect(createService().activePanelId()).toBe('controls');
    });

    it('updates activePanelId when set', () => {
        const service = createService();

        service.activePanelId.set('box-model');
        expect(service.activePanelId()).toBe('box-model');
    });

    it('returns null activePanelInjector when no panel matches', () => {
        expect(createService().activePanelInjector()).toBeNull();
    });

    describe('activeViewId', () => {
        function navigation(start: { component?: RuntimeComponent; service?: RuntimeService; pipe?: RuntimePipe } = {}) {
            const component = signal<RuntimeComponent | null>(start.component ?? null);
            const service = signal<RuntimeService | null>(start.service ?? null);
            const pipe = signal<RuntimePipe | null>(start.pipe ?? null);
            const panels = createService({ activeComponentSignal: component, activeServiceSignal: service, activePipeSignal: pipe });
            const show = (next: { component?: RuntimeComponent; service?: RuntimeService; pipe?: RuntimePipe }) => {
                component.set(next.component ?? null);
                service.set(next.service ?? null);
                pipe.set(next.pipe ?? null);
            };

            return { panels, show };
        }

        it('starts on the Playground', () => {
            expect(createService().activeViewId()).toBe('renderer');
        });

        it('starts every component on the Playground, whichever view the one before showed', () => {
            const { panels, show } = navigation({ component: makeComponent('AComponent') });

            panels.activeViewId.set('jsdoc');
            show({ component: makeComponent('BComponent') });
            expect(panels.activeViewId()).toBe('renderer');
        });

        it('keeps the view when the manifest re-links the active component', () => {
            const { panels, show } = navigation({ component: makeComponent('AComponent') });

            panels.activeViewId.set('jsdoc');
            show({ component: makeComponent('AComponent') });
            expect(panels.activeViewId()).toBe('jsdoc');
        });

        it('keeps the view of a component on the service page that follows it', () => {
            const { panels, show } = navigation({ component: makeComponent() });

            panels.activeViewId.set('jsdoc');
            show({ service: makeService() });
            expect(panels.activeViewId()).toBe('jsdoc');
        });

        it.each([
            ['service', { service: makeService() }],
            ['pipe', { pipe: makePipe() }]
        ])('starts a component that follows a %s on the Playground', (_kind, page) => {
            const { panels, show } = navigation({ component: makeComponent() });

            show(page);
            panels.activeViewId.set('jsdoc');
            show({ component: makeComponent('BComponent') });
            expect(panels.activeViewId()).toBe('renderer');
        });

        it('starts a component that follows a guide page on the Playground', () => {
            const { panels, show } = navigation({ component: makeComponent() });

            panels.activeViewId.set('overview');
            show({});
            expect(panels.activeViewId()).toBe('overview');
            show({ component: makeComponent('BComponent') });
            expect(panels.activeViewId()).toBe('renderer');
        });

        it('keeps a view set right after the switch, as a URL restore sets it', () => {
            const { panels, show } = navigation({ service: makeService() });

            panels.activeViewId.set('jsdoc');
            show({ component: makeComponent() });
            panels.activeViewId.set('jsdoc');
            expect(panels.activeViewId()).toBe('jsdoc');
        });

        it('keeps the view from a service to a pipe', () => {
            const { panels, show } = navigation({ service: makeService() });

            panels.activeViewId.set('jsdoc');
            show({ pipe: makePipe() });
            expect(panels.activeViewId()).toBe('jsdoc');
        });
    });

    describe('viewPanels', () => {
        it('keeps only panels placed in the view bar', () => {
            const service = createService({
                builtins: [
                    { id: 'overview', label: 'Overview', placement: 'view' },
                    { id: 'controls', label: 'Controls' }
                ]
            });

            expect(service.viewPanels().map((p) => p.id)).toEqual(['overview']);
        });

        it('lists builtin panels before plugin panels', () => {
            const service = createService({
                builtins: [{ id: 'overview', label: 'Overview', placement: 'view' }],
                pluginViewPanels: [{ id: 'docs', label: 'API', placement: 'view' }]
            });

            expect(service.viewPanels().map((p) => p.id)).toEqual(['overview', 'docs']);
        });
    });

    describe('visibleViewPanels', () => {
        it('is empty without an active component', () => {
            const service = createService({
                builtins: [{ id: 'overview', label: 'Overview', placement: 'view' }],
                activeComponent: null
            });

            expect(service.visibleViewPanels()).toEqual([]);
        });

        it('keeps panels that declare no isVisible', () => {
            const service = createService({
                builtins: [{ id: 'docs', label: 'API', placement: 'view' }],
                activeComponent: makeComponent()
            });

            expect(service.visibleViewPanels().map((p) => p.id)).toEqual(['docs']);
        });

        it('drops panels whose isVisible rejects the active component', () => {
            const service = createService({
                builtins: [
                    {
                        id: 'overview',
                        label: 'Overview',
                        placement: 'view',
                        isVisible: () => false
                    },
                    { id: 'docs', label: 'API', placement: 'view' }
                ],
                activeComponent: makeComponent()
            });

            expect(service.visibleViewPanels().map((p) => p.id)).toEqual(['docs']);
        });

        it('passes the active component to isVisible', () => {
            const seen: string[] = [];
            const service = createService({
                builtins: [
                    {
                        id: 'overview',
                        label: 'Overview',
                        placement: 'view',
                        isVisible: (component) => {
                            seen.push(component.meta.className);
                            return true;
                        }
                    }
                ],
                activeComponent: makeComponent('CardComponent')
            });

            service.visibleViewPanels();
            expect(seen).toEqual(['CardComponent']);
        });

        it('drops service-only panels on a component page', () => {
            const service = createService({
                builtins: [
                    { id: 'overview', label: 'Overview', placement: 'view' },
                    { id: 'usage', label: 'Usage', placement: 'view', appliesTo: ['service'] }
                ],
                activeComponent: makeComponent()
            });

            expect(service.visibleViewPanels().map((p) => p.id)).toEqual(['overview']);
        });

        it('keeps panels that apply to both on a component page', () => {
            const service = createService({
                builtins: [{ id: 'docs', label: 'API', placement: 'view', appliesTo: ['component', 'service'] }],
                activeComponent: makeComponent()
            });

            expect(service.visibleViewPanels().map((p) => p.id)).toEqual(['docs']);
        });

        it('offers only service panels while a service is active', () => {
            const service = createService({
                builtins: [
                    { id: 'overview', label: 'Overview', placement: 'view' },
                    { id: 'docs', label: 'API', placement: 'view', appliesTo: ['component', 'service'] }
                ],
                activeService: makeService()
            });

            expect(service.visibleViewPanels().map((p) => p.id)).toEqual(['docs']);
        });

        it('offers only pipe panels while a pipe is active', () => {
            const service = createService({
                builtins: [
                    { id: 'overview', label: 'Overview', placement: 'view' },
                    { id: 'notes', label: 'Notes', placement: 'view', appliesTo: ['service'] },
                    { id: 'docs', label: 'API', placement: 'view', appliesTo: ['component', 'service', 'pipe'] }
                ],
                activePipe: makePipe()
            });

            expect(service.visibleViewPanels().map((p) => p.id)).toEqual(['docs']);
        });

        it('drops pipe-only panels on component and service pages', () => {
            const builtins: PanelDefinition[] = [{ id: 'usage', label: 'Usage', placement: 'view', appliesTo: ['pipe'] }];

            expect(createService({ builtins, activeComponent: makeComponent() }).visibleViewPanels()).toEqual([]);
            expect(createService({ builtins, activeService: makeService() }).visibleViewPanels()).toEqual([]);
        });

        it('does not call isVisible for pipes', () => {
            const isVisible = jest.fn(() => false);
            const service = createService({
                builtins: [{ id: 'docs', label: 'API', placement: 'view', appliesTo: ['pipe'], isVisible }],
                activePipe: makePipe()
            });

            expect(service.visibleViewPanels().map((p) => p.id)).toEqual(['docs']);
            expect(isVisible).not.toHaveBeenCalled();
        });

        it('does not call isVisible for services', () => {
            const isVisible = jest.fn(() => false);
            const service = createService({
                builtins: [{ id: 'docs', label: 'API', placement: 'view', appliesTo: ['service'], isVisible }],
                activeService: makeService()
            });

            expect(service.visibleViewPanels().map((p) => p.id)).toEqual(['docs']);
            expect(isVisible).not.toHaveBeenCalled();
        });
    });

    describe('partsPanel', () => {
        const jsdoc: PanelDefinition = { id: 'jsdoc', label: 'API', placement: 'view', listsParts: true };

        it('names the first visible view panel that lists parts', () => {
            const service = createService({
                builtins: [{ id: 'overview', label: 'Overview', placement: 'view' }],
                pluginViewPanels: [jsdoc, { id: 'reference', label: 'Reference', placement: 'view', listsParts: true }],
                activeComponent: makeComponent()
            });

            expect(service.partsPanel()?.id).toBe('jsdoc');
        });

        it('skips a panel that lists parts but is not visible for the component', () => {
            const service = createService({
                pluginViewPanels: [
                    { ...jsdoc, isVisible: () => false },
                    { id: 'reference', label: 'Reference', placement: 'view', listsParts: true }
                ],
                activeComponent: makeComponent()
            });

            expect(service.partsPanel()?.id).toBe('reference');
        });

        it('is null when no visible view panel lists parts', () => {
            const service = createService({
                builtins: [{ id: 'overview', label: 'Overview', placement: 'view' }],
                pluginViewPanels: [{ id: 'docs', label: 'Docs', placement: 'view' }],
                activeComponent: makeComponent()
            });

            expect(service.partsPanel()).toBeNull();
        });

        it('is null without an active component', () => {
            expect(createService({ pluginViewPanels: [jsdoc] }).partsPanel()).toBeNull();
        });
    });

    describe('showPart', () => {
        const jsdoc: PanelDefinition = { id: 'jsdoc', label: 'API', placement: 'view', listsParts: true };

        it('has no active part before one is shown', () => {
            expect(createService({ pluginViewPanels: [jsdoc], activeComponent: makeComponent('SelectComponent') }).activePart()).toBeNull();
        });

        it('opens the panel on the part', () => {
            const service = createService({ pluginViewPanels: [jsdoc], activeComponent: makeComponent('SelectComponent') });

            service.showPart('OptionComponent', 'jsdoc');

            expect(service.activeViewId()).toBe('jsdoc');
            expect(service.activePart()).toBe('OptionComponent');
        });

        it('shows a part until the component or the view changes', () => {
            const service = createService({ pluginViewPanels: [jsdoc], activeComponent: makeComponent('SelectComponent') });

            service.showPart('OptionComponent', 'jsdoc');
            flush();
            expect(service.activePart()).toBe('OptionComponent');

            service.activeViewId.set('renderer');
            flush();
            expect(service.activePart()).toBeNull();

            service.activeViewId.set('jsdoc');
            flush();
            expect(service.activePart()).toBeNull();
        });

        it('forgets the part once the component changes, even if the view and the component come back', () => {
            const activeComponentSignal = signal<RuntimeComponent | null>(makeComponent('SelectComponent'));
            const service = createService({ pluginViewPanels: [jsdoc], activeComponentSignal });

            service.showPart('OptionComponent', 'jsdoc');
            flush();

            activeComponentSignal.set(makeComponent('ButtonComponent'));
            flush();
            expect(service.activePart()).toBeNull();

            activeComponentSignal.set(makeComponent('SelectComponent'));
            flush();
            expect(service.activePart()).toBeNull();
        });

        it('forgets the part on clearPart', () => {
            const service = createService({ pluginViewPanels: [jsdoc], activeComponent: makeComponent('SelectComponent') });

            service.showPart('OptionComponent', 'jsdoc');
            service.clearPart();

            expect(service.activePart()).toBeNull();
            expect(service.activeViewId()).toBe('jsdoc');
        });

        it('shows the part that was shown last', () => {
            const service = createService({ pluginViewPanels: [jsdoc], activeComponent: makeComponent('SelectComponent') });

            service.showPart('OptionComponent', 'jsdoc');
            service.showPart('GroupComponent', 'jsdoc');

            expect(service.activePart()).toBe('GroupComponent');
        });

        /** The panel jumps when `activePart` changes; the same part again would not change it. */
        it('jumps again when the active part is shown again', () => {
            const service = createService({ pluginViewPanels: [jsdoc], activeComponent: makeComponent('SelectComponent') });
            const seen: (string | null)[] = [];

            TestBed.runInInjectionContext(() => effect(() => seen.push(service.activePart())));
            service.showPart('OptionComponent', 'jsdoc');
            flush();

            service.showPart('OptionComponent', 'jsdoc');
            expect(service.activePart()).toBeNull();
            expect(service.activeViewId()).toBe('jsdoc');

            flush();
            expect(service.activePart()).toBe('OptionComponent');
            expect(seen).toEqual(['OptionComponent', null, 'OptionComponent']);
        });

        it('does not bring the part back over one shown before the next render', () => {
            const service = createService({ pluginViewPanels: [jsdoc], activeComponent: makeComponent('SelectComponent') });

            service.showPart('OptionComponent', 'jsdoc');
            flush();

            service.showPart('OptionComponent', 'jsdoc');
            service.showPart('GroupComponent', 'jsdoc');
            flush();

            expect(service.activePart()).toBe('GroupComponent');
        });

        it('does not bring the part back after clearPart', () => {
            const service = createService({ pluginViewPanels: [jsdoc], activeComponent: makeComponent('SelectComponent') });

            service.showPart('OptionComponent', 'jsdoc');
            flush();

            service.showPart('OptionComponent', 'jsdoc');
            service.clearPart();
            flush();

            expect(service.activePart()).toBeNull();
        });

        it('shows a part at once when it is the active one only in another view', () => {
            const service = createService({
                pluginViewPanels: [jsdoc, { id: 'docs', label: 'Docs', placement: 'view', listsParts: true }],
                activeComponent: makeComponent('SelectComponent')
            });

            service.showPart('OptionComponent', 'jsdoc');
            flush();

            service.showPart('OptionComponent', 'docs');

            expect(service.activeViewId()).toBe('docs');
            expect(service.activePart()).toBe('OptionComponent');
        });
    });
});
