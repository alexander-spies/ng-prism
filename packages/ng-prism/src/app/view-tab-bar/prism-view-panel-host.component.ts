import { NgComponentOutlet } from '@angular/common';
import { Component, computed, createEnvironmentInjector, effect, EnvironmentInjector, inject, OnDestroy, signal, type Type } from '@angular/core';
import { PrismNavigationService } from '../services/prism-navigation.service.js';
import { PrismPanelService } from '../services/prism-panel.service.js';
import { panelInputsFor } from './panel-inputs.js';

@Component({
    selector: 'prism-view-panel-host',
    standalone: true,
    imports: [NgComponentOutlet],
    templateUrl: './prism-view-panel-host.component.html',
    styleUrl: './prism-view-panel-host.component.css'
})
export class PrismViewPanelHostComponent implements OnDestroy {
    private readonly nav = inject(PrismNavigationService);
    protected readonly panelService = inject(PrismPanelService);
    private readonly envInjector = inject(EnvironmentInjector);

    private readonly allViewPanels = this.panelService.viewPanels;

    protected readonly resolvedComponent = signal<Type<unknown> | null>(null);
    private readonly activePanel = computed(() => this.allViewPanels().find((p) => p.id === this.panelService.activeViewId()));

    protected readonly panelInputs = computed(() => panelInputsFor(this.activePanel(), this.nav.activeComponent(), this.nav.activeService()));

    private readonly lazyCache = new Map<string, Type<unknown>>();
    private readonly injectorCache = new Map<string, EnvironmentInjector>();

    protected readonly activeInjector = computed(() => {
        const panel = this.activePanel();

        if (!panel?.providers?.length) return this.envInjector;

        if (!this.injectorCache.has(panel.id)) {
            this.injectorCache.set(panel.id, createEnvironmentInjector(panel.providers, this.envInjector, `PrismViewPanel[${panel.id}]`));
        }
        return this.injectorCache.get(panel.id)!;
    });

    constructor() {
        effect(() => {
            const panel = this.activePanel();

            if (!panel) {
                this.resolvedComponent.set(null);
                return;
            }

            if (panel.component) {
                this.resolvedComponent.set(panel.component);
                return;
            }

            if (panel.loadComponent) {
                const cached = this.lazyCache.get(panel.id);

                if (cached) {
                    this.resolvedComponent.set(cached);
                    return;
                }

                this.resolvedComponent.set(null);
                panel.loadComponent().then((comp) => {
                    this.lazyCache.set(panel.id, comp);
                    this.resolvedComponent.set(comp);
                });
            }
        });
    }

    ngOnDestroy(): void {
        this.injectorCache.forEach((injector) => injector.destroy());
    }
}
