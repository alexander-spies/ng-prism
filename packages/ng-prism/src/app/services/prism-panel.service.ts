import { computed, createEnvironmentInjector, effect, EnvironmentInjector, inject, Injectable, signal, untracked } from '@angular/core';
import type { PanelDefinition } from '../../plugin/plugin.types.js';
import { PRISM_BUILTIN_PANELS } from '../tokens/prism-tokens.js';
import { panelTargets } from '../view-tab-bar/panel-inputs.js';
import { PrismNavigationService } from './prism-navigation.service.js';
import { PrismPluginService } from './prism-plugin.service.js';

/** A part a panel was asked to show: where it was asked, so it stops showing once the reader leaves that place. */
interface ShownPart {
    part: string;
    component: string;
    view: string;
}

@Injectable({ providedIn: 'root' })
export class PrismPanelService {
    private readonly envInjector = inject(EnvironmentInjector);
    private readonly pluginService = inject(PrismPluginService);
    private readonly navigationService = inject(PrismNavigationService);
    private readonly builtinPanels = inject(PRISM_BUILTIN_PANELS);
    private readonly injectorCache = new Map<string, EnvironmentInjector>();

    readonly activePanelId = signal<string>('controls');
    readonly activeViewId = signal<string>('renderer');

    readonly activePanelInjector = computed<EnvironmentInjector | null>(() => this.getInjector(this.activePanelId()));

    /**
     * Every panel that renders as a view tab, builtin before plugin.
     *
     * Unfiltered because `prism-view-panel-host` resolves the active view
     * through this list. Filtering here would let the host come up empty for a
     * frame whenever a component switch invalidates the active view, because the
     * fallback in `prism-shell` runs in the same change-detection round.
     */
    readonly viewPanels = computed<PanelDefinition[]>(() => [...this.builtinPanels.filter((p) => p.placement === 'view'), ...this.pluginService.viewPanels()]);

    /**
     * The view panels the active page actually offers.
     *
     * A service or a pipe gets the panels that apply to its kind, all of them:
     * `isVisible` takes a component, so it has nothing to say about either. A
     * component gets the panels that apply to components and pass their
     * `isVisible`. Empty when none of the three is active, which is how pages end
     * up without view tabs: it falls out of the data instead of needing a case of
     * its own.
     */
    readonly visibleViewPanels = computed<PanelDefinition[]>(() => {
        const target = this.navigationService.activeTarget();

        if (target === 'service' || target === 'pipe') {
            return this.viewPanels().filter((p) => panelTargets(p).includes(target));
        }
        const component = this.navigationService.activeComponent();

        if (!component) return [];
        return this.viewPanels().filter((p) => panelTargets(p).includes('component') && (!p.isVisible || p.isVisible(component)));
    });

    /**
     * The view panel the part popovers link to: the first visible one that lists
     * parts, in registration order, builtin before plugin. `null` when the active
     * page offers none, which is how the popover ends up without its link.
     * Since 22.7.0.
     */
    readonly partsPanel = computed<PanelDefinition | null>(() => this.visibleViewPanels().find((p) => p.listsParts) ?? null);

    private readonly shownPart = signal<ShownPart | null>(null);

    /**
     * The class name of the part the active view is asked to show, `null` for
     * none. It holds only while the active component and the active view are the
     * ones {@link showPart} was called on, so a part never outlives the place it
     * was shown in. The URL carries it as `part`. Since 22.7.0.
     */
    readonly activePart = computed<string | null>(() => {
        const shown = this.shownPart();

        return shown && this.isShownHere(shown) ? shown.part : null;
    });

    constructor() {
        // `activePart` already reads `null` once the reader leaves, so this is not
        // what hides the part. It forgets the record, which would otherwise show
        // the part again on the way back to the same component and view.
        effect(() => {
            const shown = this.shownPart();

            if (shown && !this.isShownHere(shown)) {
                untracked(() => this.shownPart.set(null));
            }
        });
    }

    /**
     * Opens the view panel `panelId` on a part of the active component. The
     * panel reads it as its `activePart` input. A part that is not one of the
     * component's is not checked here: the panel finds no block for it.
     * Since 22.7.0.
     */
    showPart(partClassName: string, panelId: string): void {
        const component = this.navigationService.activeComponent();

        this.activeViewId.set(panelId);
        this.shownPart.set(component ? { part: partClassName, component: component.meta.className, view: panelId } : null);
    }

    /** Forgets the part without leaving the view. */
    clearPart(): void {
        this.shownPart.set(null);
    }

    /**
     * Returns (and lazily creates) the EnvironmentInjector scoped to the given panel.
     * Returns `null` when the panel has no providers.
     */
    getInjector(panelId: string): EnvironmentInjector | null {
        const allPanels = [...this.builtinPanels, ...this.pluginService.panels()];
        const panel = allPanels.find((p) => p.id === panelId);

        if (!panel?.providers?.length) return null;

        let injector = this.injectorCache.get(panel.id);

        if (!injector) {
            injector = createEnvironmentInjector(panel.providers, this.envInjector, `PrismPanel[${panel.id}]`);
            this.injectorCache.set(panel.id, injector);
        }
        return injector;
    }

    private isShownHere(shown: ShownPart): boolean {
        return this.navigationService.activeComponent()?.meta.className === shown.component && this.activeViewId() === shown.view;
    }
}
