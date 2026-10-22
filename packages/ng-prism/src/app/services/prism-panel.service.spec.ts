import { EnvironmentInjector, Injector, runInInjectionContext, signal, type Type } from '@angular/core';
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
        activeService?: RuntimeService | null;
        activePipe?: RuntimePipe | null;
    } = {}
): PrismPanelService {
    const pluginStub = {
        panels: signal([]).asReadonly(),
        viewPanels: signal(options.pluginViewPanels ?? []).asReadonly()
    } as unknown as PrismPluginService;
    // The real `activeTarget` is derived from the three re-linked signals the
    // same way: at most one of them is non-null.
    const target = options.activeComponent ? 'component' : options.activeService ? 'service' : options.activePipe ? 'pipe' : null;
    const navigationStub = {
        activeComponent: signal(options.activeComponent ?? null).asReadonly(),
        activeService: signal(options.activeService ?? null).asReadonly(),
        activePipe: signal(options.activePipe ?? null).asReadonly(),
        activeTarget: signal(target).asReadonly()
    } as unknown as PrismNavigationService;

    const injector = Injector.create({
        providers: [
            { provide: PrismPluginService, useValue: pluginStub },
            { provide: PrismNavigationService, useValue: navigationStub },
            { provide: PRISM_BUILTIN_PANELS, useValue: options.builtins ?? [] },
            { provide: EnvironmentInjector, useValue: {} }
        ]
    });

    return runInInjectionContext(injector, () => new PrismPanelService());
}

describe('PrismPanelService', () => {
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
});
