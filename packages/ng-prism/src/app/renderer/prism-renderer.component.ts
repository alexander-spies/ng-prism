import { NgComponentOutlet } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    type ComponentRef,
    computed,
    DestroyRef,
    effect,
    ElementRef,
    inject,
    Injector,
    signal,
    type Type,
    untracked,
    viewChild,
    ViewContainerRef
} from '@angular/core';
import type { ComponentPage } from '../../plugin/page.types.js';
import type { PanelDefinition, RuntimeComponent } from '../../plugin/plugin.types.js';
import { PSEUDO_STATES } from '../../shared/pseudo-state.type.js';
import { VIEWPORT_MAX, VIEWPORT_MIN } from '../../shared/viewport.type.js';
import { CANVAS_BG_STYLES } from '../canvas/canvas-bg.styles.js';
import { PrismCanvasBgPillComponent } from '../canvas/prism-canvas-bg-pill.component.js';
import { PrismCanvasMeasureComponent } from '../canvas/prism-canvas-measure.component.js';
import { PrismCanvasRulersComponent } from '../canvas/prism-canvas-rulers.component.js';
import { snapViewportWidth } from '../canvas/viewport-snap.js';
import { PrismResizerDirective } from '../directives/prism-resizer.directive.js';
import { BUILTIN_PANELS } from '../panels/builtin-panels.js';
import { PrismCanvasService } from '../services/prism-canvas.service.js';
import { PrismCaptureService } from '../services/prism-capture.service.js';
import { PrismEventLogService } from '../services/prism-event-log.service.js';
import { PrismManifestService } from '../services/prism-manifest.service.js';
import { PrismNavigationService } from '../services/prism-navigation.service.js';
import { PrismPanelService } from '../services/prism-panel.service.js';
import { PrismPluginService } from '../services/prism-plugin.service.js';
import { PrismPseudoStateService } from '../services/prism-pseudo-state.service.js';
import { PrismRendererService } from '../services/prism-renderer.service.js';
import { PrismVariantBgService } from '../services/prism-variant-bg.service.js';
import { PRISM_RENDERER_HOOKS } from '../tokens/prism-tokens.js';
import { buildKnownInputs } from './known-inputs.js';
import { resolveOverlay } from './overlay-resolver.js';
import { parseContentToNodes } from './projectable-content.js';
import { resolveRenderedKey } from './rendered-key.js';

@Component({
    selector: 'prism-renderer',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [PrismCanvasRulersComponent, PrismCanvasBgPillComponent, PrismCanvasMeasureComponent, NgComponentOutlet, PrismResizerDirective],
    templateUrl: './prism-renderer.component.html',
    styleUrl: './prism-renderer.component.css',
    styles: [CANVAS_BG_STYLES]
})
export class PrismRendererComponent {
    protected readonly navigationService = inject(PrismNavigationService);
    protected readonly rendererService = inject(PrismRendererService);
    protected readonly canvasService = inject(PrismCanvasService);
    protected readonly capture = inject(PrismCaptureService);
    protected readonly variantBg = inject(PrismVariantBgService);
    private readonly pseudoState = inject(PrismPseudoStateService);

    /**
     * The width the canvas is actually constrained to, `null` for unconstrained.
     *
     * Every viewport binding reads this rather than the service directly, so
     * capture mode cannot be constrained by any route. Previously only the grips
     * and the dimension line sat behind the capture guard while the attributes
     * that change `.demo-wrap`'s box did not. Safe in practice, because capture
     * never restores a persisted width and every setter is suppressed, but safe
     * by reachability argument rather than by construction. A future caller of
     * `setViewportWidth` during a capture run would have recorded every
     * visual-regression baseline at the constrained width with no visible chrome
     * to reveal it. One computed makes the guarantee structural.
     */
    protected readonly viewportWidth = computed(() => (this.capture.active() ? null : this.canvasService.viewportWidth()));

    protected readonly VIEWPORT_MIN = VIEWPORT_MIN;
    protected readonly VIEWPORT_MAX = VIEWPORT_MAX;

    /**
     * A drag on either grip, rested on a preset if it came close enough.
     *
     * The snapping lives here and not in `PrismResizerDirective` because the
     * directive also drives the sidebar and the panel, where there is nothing to
     * snap to, and a generic control that knows about viewport presets would be
     * the wrong shape.
     */
    protected onViewportResize(width: number): void {
        this.canvasService.setViewportWidth(snapViewportWidth(width));
    }

    private readonly eventLogService = inject(PrismEventLogService);
    private readonly manifestService = inject(PrismManifestService);
    private readonly injector = inject(Injector);
    private readonly destroyRef = inject(DestroyRef);
    private readonly host = inject(ElementRef<HTMLElement>);
    private readonly rendererHooks = inject(PRISM_RENDERER_HOOKS, {
        optional: true
    });

    private readonly panelService = inject(PrismPanelService);
    private readonly pluginService = inject(PrismPluginService);
    private readonly pseudoMarker = this.pseudoState.createMarker();

    private readonly outlet = viewChild.required('outlet', {
        read: ViewContainerRef
    });
    private componentRef: ComponentRef<unknown> | null = null;
    private outputSubscriptions: Array<{ unsubscribe(): void }> = [];
    private lastProjectedContent: string | Record<string, string> | undefined = undefined;
    private isRenderPage = false;

    private readonly overlayCache = new Map<string, Type<unknown>>();
    readonly activeOverlay = signal<Type<unknown> | null>(null);
    /**
     * Identifier of the currently rendered component/variant (for audit tooling / e2e).
     * Held back until the variant's forced pseudo states are in place, see {@link resolveRenderedKey}.
     */
    protected readonly renderedKey = computed(() =>
        resolveRenderedKey({
            component: this.navigationService.activeComponent(),
            variantIndex: this.rendererService.activeVariantIndex(),
            element: this.rendererService.renderedElement(),
            pseudo: this.pseudoState.effective(),
            pseudoApplied: this.pseudoMarker.applied()
        })
    );
    /**
     * The states forced on the canvas, space-separated, `null` for none. Capture
     * mode keys the room it leaves for focus rings on it.
     */
    protected readonly forcedStates = computed(() => {
        const states = this.pseudoMarker.applied()?.states;

        return states ? PSEUDO_STATES.filter((state) => states[state] !== undefined).join(' ') : null;
    });
    /** Resolved canvas layout for the active variant. Variant overrides component config; defaults to 'fit'. */
    protected readonly canvasLayout = computed(() => {
        const comp = this.navigationService.activeComponent();

        if (!comp) return 'fit';
        const variant = comp.meta.showcaseConfig.variants?.[this.rendererService.activeVariantIndex()];

        return variant?.canvasLayout ?? comp.meta.showcaseConfig.canvasLayout ?? 'fit';
    });
    protected readonly overlayInputs = { rendererService: this.rendererService };
    protected readonly overlayInjector = computed(() => {
        const panelInjector = this.panelService.activePanelInjector();

        return panelInjector ?? this.injector;
    });

    constructor() {
        effect(() => {
            const comp = this.navigationService.activeComponent();

            if (!comp) return;
            untracked(() => {
                this.host.nativeElement.scrollTop = 0;
                this.rendererService.reconcileForComponent(comp);
                this.createComponent(comp);
            });
        });

        effect(() => {
            const inputs = this.rendererService.inputValues();
            const content = this.rendererService.activeContent();
            const ref = this.componentRef;

            if (!ref) return;

            if (this.isRenderPage) {
                ref.changeDetectorRef.detectChanges();
                return;
            }

            const comp = untracked(() => this.navigationService.activeComponent());

            if (!comp) return;

            if (content !== this.lastProjectedContent) {
                untracked(() => this.createComponent(comp));
                return;
            }

            performance.mark('prism:rerender:start');
            const knownInputs = buildKnownInputs(comp);

            for (const [key, value] of Object.entries(inputs)) {
                if (!knownInputs.has(key)) {
                    console.warn(`[ng-prism] Unknown input "${key}" on <${comp.meta.componentMeta.selector}>, skipping. Remove it from @Showcase variants.`);
                    continue;
                }
                ref.setInput(key, value);
            }
            ref.changeDetectorRef.detectChanges();
            performance.mark('prism:rerender:end');
            performance.measure('prism:rerender', 'prism:rerender:start', 'prism:rerender:end');
        });

        effect(() => {
            const panelId = this.panelService.activePanelId();
            const allPanels: PanelDefinition[] = [...BUILTIN_PANELS, ...this.pluginService.panels()];
            const resolution = resolveOverlay(allPanels, panelId, {
                captureActive: this.capture.active(),
                measureActive: this.canvasService.measure(),
                cache: this.overlayCache
            });

            if (resolution.kind === 'eager') {
                this.activeOverlay.set(resolution.component);
                return;
            }

            this.activeOverlay.set(null);
            if (resolution.kind !== 'lazy') return;

            const { panelId: requestedPanelId, load } = resolution;

            load().then((c) => {
                this.overlayCache.set(requestedPanelId, c);
                if (this.panelService.activePanelId() === requestedPanelId) {
                    this.activeOverlay.set(c);
                }
            });
        });

        // `renderedKey` waits for what this applies.
        effect(() => {
            const element = this.rendererService.renderedElement();
            const states = this.pseudoState.effective();

            untracked(() => this.pseudoMarker.apply(element, states));
        });

        this.destroyRef.onDestroy(() => {
            this.cleanup();
            this.pseudoMarker.clear();
        });
    }

    private createComponent(comp: RuntimeComponent): void {
        this.cleanup();

        const renderPageTitle = comp.meta.showcaseConfig.renderPage;

        if (renderPageTitle) {
            const page = this.manifestService.manifest().pages?.find((p): p is ComponentPage => p.type === 'component' && p.title === renderPageTitle);

            if (page) {
                this.isRenderPage = true;
                const injector = Injector.create({
                    providers: comp.meta.showcaseConfig.providers ?? [],
                    parent: this.injector
                });

                this.componentRef = this.outlet().createComponent(page.component, {
                    injector
                });
                this.componentRef.changeDetectorRef.detectChanges();
                this.rendererService.renderedElement.set(this.componentRef.location.nativeElement);
                return;
            }
        }

        this.isRenderPage = false;
        const selector = comp.meta.componentMeta.selector;
        const detail = { detail: { selector } };

        this.rendererHooks?.onBeforeCreate?.(selector);
        performance.mark('prism:render:start', detail);

        const injector = Injector.create({
            providers: comp.meta.showcaseConfig.providers ?? [],
            parent: this.injector
        });

        const content = this.rendererService.activeContent();

        this.lastProjectedContent = content;
        const projectableNodes = content ? parseContentToNodes(content) : undefined;

        this.componentRef = this.outlet().createComponent(comp.type, {
            injector,
            projectableNodes
        });

        for (const output of comp.meta.outputs) {
            const emitter = (this.componentRef.instance as Record<string, unknown>)[output.name];

            if (emitter && typeof (emitter as { subscribe?: unknown }).subscribe === 'function') {
                const sub = (
                    emitter as {
                        subscribe(fn: (v: unknown) => void): { unsubscribe(): void };
                    }
                ).subscribe((v: unknown) => this.eventLogService.log(output.name, v));

                this.outputSubscriptions.push(sub);
            }
        }

        const knownInputs = buildKnownInputs(comp);

        for (const [key, value] of Object.entries(this.rendererService.inputValues())) {
            if (!knownInputs.has(key)) {
                console.warn(`[ng-prism] Unknown input "${key}" on <${selector}>, skipping. Remove it from @Showcase variants.`);
                continue;
            }
            this.componentRef.setInput(key, value);
        }
        this.componentRef.changeDetectorRef.detectChanges();

        performance.mark('prism:render:end', detail);
        performance.measure('prism:render', 'prism:render:start', 'prism:render:end');

        this.rendererService.renderedElement.set(this.componentRef.location.nativeElement);
        this.rendererHooks?.onAfterCreate?.(selector);
    }

    private cleanup(): void {
        const hadComponent = this.componentRef !== null;

        this.rendererService.renderedElement.set(null);
        for (const sub of this.outputSubscriptions) {
            sub.unsubscribe();
        }
        this.outputSubscriptions = [];
        this.outlet().clear();
        this.componentRef = null;
        this.lastProjectedContent = undefined;
        if (hadComponent) {
            this.rendererHooks?.onAfterDestroy?.('');
        }
    }
}
