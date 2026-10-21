import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, EnvironmentInjector, inject, signal, type Type, untracked } from '@angular/core';
import type { NgPrismConfig, PanelDefinition, RuntimeManifest } from '../../../plugin/plugin.types.js';
import { PrismIconComponent } from '../../icons/prism-icon.component.js';
import { PrismNavigationService } from '../../services/prism-navigation.service.js';
import { PrismPanelService } from '../../services/prism-panel.service.js';
import { PrismPluginService } from '../../services/prism-plugin.service.js';
import { PrismRendererService } from '../../services/prism-renderer.service.js';
import { PRISM_CONFIG, PRISM_MANIFEST } from '../../tokens/prism-tokens.js';
import { A11yAuditService } from '../a11y/a11y-audit.service.js';
import { resolveA11yThresholds } from '../a11y/a11y-thresholds.js';
import type { A11yCoreConfig, A11yManifestMeta } from '../a11y/a11y.types.js';
import { BUILTIN_PANELS } from '../builtin-panels.js';
import { addonPanelsFor } from './addon-panels.js';
import { resolvePanelBadge } from './panel-badge.js';

type RenderedPanelEntry = {
    id: string;
    component: Type<unknown>;
    injector: EnvironmentInjector | null;
    keepAlive: boolean;
};

@Component({
    selector: 'prism-panel-host',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NgComponentOutlet, PrismIconComponent],
    templateUrl: './prism-panel-host.component.html',
    styleUrl: './prism-panel-host.component.css'
})
export class PrismPanelHostComponent {
    private readonly pluginService = inject(PrismPluginService);
    private readonly nav = inject(PrismNavigationService);
    protected readonly panelService = inject(PrismPanelService);
    protected readonly envInjector = inject(EnvironmentInjector);
    private readonly auditService = inject(A11yAuditService);
    private readonly rendererService = inject(PrismRendererService);
    private readonly manifest = inject<RuntimeManifest>(PRISM_MANIFEST);
    private readonly config = inject<NgPrismConfig>(PRISM_CONFIG);

    /**
     * The configured thresholds, resolved the way the a11y header badge resolves
     * them: the build step's numbers as the base, the app config on top. Both
     * are static for the session, so this is computed once rather than per tab.
     */
    private readonly a11yThresholds = computed(() => {
        const meta = this.manifest.meta?.['a11y'] as A11yManifestMeta | undefined;

        return resolveA11yThresholds({
            ...meta?.thresholds,
            ...this.config.a11y?.thresholds
        });
    });

    private readonly inputCount = computed(() => {
        const comp = this.nav.activeComponent();

        return comp?.meta.inputs.length ?? 0;
    });

    protected panelBadge(panel: PanelDefinition) {
        return resolvePanelBadge(panel, this.nav.activeComponent(), {
            inputCount: this.inputCount(),
            a11yResult: this.auditService.scoreResult(),
            a11yThresholds: this.a11yThresholds()
        });
    }

    private readonly builtInPanels = BUILTIN_PANELS;

    protected readonly allPanels = computed(() =>
        addonPanelsFor([...this.builtInPanels.filter((p) => p.placement !== 'view'), ...this.pluginService.addonPanels()], this.nav.activeComponent())
    );

    protected readonly panelInputs = computed(() => ({
        activeComponent: this.nav.activeComponent()
    }));

    private readonly lazyCache = new Map<string, Type<unknown>>();

    private readonly renderedPanels = signal<Map<string, RenderedPanelEntry>>(new Map());
    protected readonly renderedPanelsArray = computed(() => Array.from(this.renderedPanels().values()));

    constructor() {
        effect(() => {
            const element = this.rendererService.renderedElement();
            const comp = this.nav.activeComponent() as any;

            this.rendererService.inputValues();
            this.rendererService.activeVariantIndex();

            if (!element || !comp) {
                this.auditService.clear();
                return;
            }

            const a11yConfig: A11yCoreConfig | undefined = comp.meta?.showcaseConfig?.meta?.['a11y'];

            if (a11yConfig?.disable === true) {
                this.auditService.clear();
                return;
            }

            this.auditService.scheduleAudit(element, a11yConfig);
        });

        effect(() => {
            const activeId = this.panelService.activePanelId();
            const panels = this.allPanels();

            untracked(() => {
                const panel = panels.find((p) => p.id === activeId) ?? null;

                if (panel) {
                    this.ensurePanelLoaded(panel);
                }
                this.pruneRenderedPanels(panels, panel ? activeId : null);
            });
        });
    }

    private ensurePanelLoaded(panel: PanelDefinition): void {
        if (this.renderedPanels().has(panel.id)) return;

        if (panel.component) {
            this.addRenderedPanel(panel, panel.component);
            return;
        }

        if (panel.loadComponent) {
            const cached = this.lazyCache.get(panel.id);

            if (cached) {
                this.addRenderedPanel(panel, cached);
                return;
            }

            panel.loadComponent().then((comp) => {
                this.lazyCache.set(panel.id, comp);
                if (this.renderedPanels().has(panel.id)) return;
                this.addRenderedPanel(panel, comp);
            });
        }
    }

    private addRenderedPanel(panel: PanelDefinition, component: Type<unknown>): void {
        const next = new Map(this.renderedPanels());

        next.set(panel.id, {
            id: panel.id,
            component,
            injector: this.panelService.getInjector(panel.id),
            keepAlive: panel.keepAlive === true
        });
        this.renderedPanels.set(next);
    }

    private pruneRenderedPanels(visiblePanels: PanelDefinition[], activeId: string | null): void {
        const current = this.renderedPanels();

        if (current.size === 0) return;

        const visibleIds = new Set(visiblePanels.map((p) => p.id));
        const next = new Map(current);
        let changed = false;

        for (const [id, entry] of current) {
            const isVisible = visibleIds.has(id);
            const isActive = id === activeId;

            if (!isVisible || (!isActive && !entry.keepAlive)) {
                next.delete(id);
                changed = true;
            }
        }
        if (changed) this.renderedPanels.set(next);
    }
}
