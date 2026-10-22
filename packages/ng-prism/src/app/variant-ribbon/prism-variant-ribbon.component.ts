import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { PrismIconComponent } from '../icons/prism-icon.component.js';
import { PrismNavigationService } from '../services/prism-navigation.service.js';
import { PrismRendererService } from '../services/prism-renderer.service.js';
import { PrismIconButtonComponent } from '../shared/prism-icon-button.component.js';
import { type PrismTabItem, PrismTabsComponent } from '../shared/prism-tabs.component.js';

@Component({
    selector: 'prism-variant-ribbon',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [PrismIconComponent, PrismTabsComponent, PrismIconButtonComponent],
    templateUrl: './prism-variant-ribbon.component.html',
    styleUrl: './prism-variant-ribbon.component.css'
})
export class PrismVariantRibbonComponent {
    private readonly navigationService = inject(PrismNavigationService);
    protected readonly rendererService = inject(PrismRendererService);

    protected readonly variants = computed(() => {
        const comp = this.navigationService.activeComponent();

        return comp?.meta.showcaseConfig.variants ?? [];
    });

    /** One tab per variant, keyed by index: names need not be unique. */
    protected readonly tabItems = computed<PrismTabItem[]>(() => this.variants().map((v, i) => ({ id: String(i), label: v.name })));

    protected select(id: string | null): void {
        if (id !== null) this.rendererService.selectVariant(Number(id));
    }

    protected prev(): void {
        const idx = this.rendererService.activeVariantIndex();

        if (idx > 0) this.rendererService.selectVariant(idx - 1);
    }

    protected next(): void {
        const idx = this.rendererService.activeVariantIndex();

        if (idx < this.variants().length - 1) this.rendererService.selectVariant(idx + 1);
    }
}
