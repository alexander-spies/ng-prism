import { computed, createEnvironmentInjector, EnvironmentInjector, inject, Injectable, signal } from '@angular/core';
import type { PanelDefinition } from '../../plugin/plugin.types.js';
import { PRISM_BUILTIN_PANELS } from '../tokens/prism-tokens.js';
import { panelTargets } from '../view-tab-bar/panel-inputs.js';
import { PrismNavigationService } from './prism-navigation.service.js';
import { PrismPluginService } from './prism-plugin.service.js';

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
     * A service gets the panels that apply to services, all of them: `isVisible`
     * takes a component, so it has nothing to say about a service. A component
     * gets the panels that apply to components and pass their `isVisible`.
     * Empty when neither is active, which is how pages end up without view tabs:
     * it falls out of the data instead of needing a case of its own.
     */
    readonly visibleViewPanels = computed<PanelDefinition[]>(() => {
        if (this.navigationService.activeService()) {
            return this.viewPanels().filter((p) => panelTargets(p).includes('service'));
        }
        const component = this.navigationService.activeComponent();

        if (!component) return [];
        return this.viewPanels().filter((p) => panelTargets(p).includes('component') && (!p.isVisible || p.isVisible(component)));
    });

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
}
